/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core-http-server';
import { PodLogger } from '../logger';
import { createPodCoreContext } from './core_context';
import {
  PodCoreServices,
  getPodRequestUser,
  registerCoreConfigSchemas,
  withPodFeatureFlagOverrides,
} from './core_services';
import { createServerInfo } from './server_info';

const createServices = (podConfig: Record<string, unknown> = {}) => {
  const config = withPodFeatureFlagOverrides(podConfig);
  const coreContext = createPodCoreContext({ config, logger: new PodLogger('test', 'off') });
  registerCoreConfigSchemas(coreContext);
  return { coreContext, services: new PodCoreServices(coreContext, config) };
};

const setupServices = async (
  services: PodCoreServices,
  client: unknown = { child: jest.fn(), security: {}, transport: { request: jest.fn() } }
) => {
  const registered: unknown[] = [];
  const setup = await services.setup({
    savedObjects: { registerType: (type: unknown) => registered.push(type) },
    internalClient: client as never,
  });
  return { setup, registered, client };
};

describe('task pod core services', () => {
  describe('config', () => {
    it('runs Core with the pod version, in production mode, as a built Kibana', () => {
      const { coreContext } = createServices();
      expect(coreContext.env.mode).toEqual(expect.objectContaining({ dev: false, prod: true }));
      expect(coreContext.env.packageInfo.dist).toBe(true);
    });

    it('forces the pod feature flag overrides under the configured ones', () => {
      expect(
        withPodFeatureFlagOverrides({ feature_flags: { overrides: { other: 1 } }, x: 1 })
      ).toEqual({
        x: 1,
        feature_flags: {
          overrides: { 'workflows.kibanaRequest.coreSelfClientEnabled': true, other: 1 },
        },
      });
    });

    it('validates plugin config through the ConfigService', async () => {
      const { coreContext } = createServices({ xpack: { thing: { size: 3 } } });
      coreContext.configService.setSchema(
        'xpack.thing',
        schema.object({ size: schema.number(), more: schema.number({ defaultValue: 5 }) })
      );
      await coreContext.configService.validate({ logDeprecations: false });
      expect(coreContext.configService.atPathSync('xpack.thing')).toEqual({ size: 3, more: 5 });
    });
  });

  describe('feature flags', () => {
    it('serves the pod overrides', async () => {
      const { services } = createServices();
      await setupServices(services);
      const { featureFlags } = await services.start();
      expect(
        await featureFlags.getBooleanValue('workflows.kibanaRequest.coreSelfClientEnabled', false)
      ).toBe(true);
      expect(await featureFlags.getBooleanValue('some.other.flag', false)).toBe(false);
      await services.stop();
    });
  });

  describe('ui settings', () => {
    it('registers its saved object types and the core defaults, and rejects duplicates', async () => {
      const { services } = createServices();
      const { setup, registered } = await setupServices(services);
      expect(registered.map((type) => (type as { name: string }).name).sort()).toEqual([
        'config',
        'config-global',
      ]);
      const definition = { name: 'x', value: 'a', schema: schema.string() };
      setup.uiSettings.register({ 'my:setting': definition } as never);
      expect(() => setup.uiSettings.register({ 'my:setting': definition } as never)).toThrow(
        /already registered/
      );
      // `dateFormat` is one of Core's own settings
      expect(() => setup.uiSettings.register({ dateFormat: definition } as never)).toThrow(
        /already registered/
      );
      await services.start();
      await services.stop();
    });
  });

  describe('security', () => {
    it('reports the user a run enriched its fake request with', async () => {
      const { services } = createServices();
      const { setup } = await setupServices(services);
      const { security } = await services.start();
      const request = { headers: {} } as unknown as KibanaRequest;
      expect(security.authc.getCurrentUser(request)).toBeNull();
      setup.enrichFakeRequest(request, { profileId: 'u_1', username: 'alice' } as never);
      expect(security.authc.getCurrentUser(request)).toEqual({
        username: 'alice',
        profile_uid: 'u_1',
      });
      expect(getPodRequestUser(request)).toEqual({ username: 'alice', profile_uid: 'u_1' });
      await services.stop();
    });

    it('has no service accounts, no audit and no UIAM', async () => {
      const { services } = createServices();
      await setupServices(services);
      const { security } = await services.start();
      const serviceAccounts = security.serviceAccounts.asScopedToPlugin('myPlugin');
      expect(serviceAccounts.isEnabled()).toBe(false);
      expect(security.audit.asScoped({} as never).enabled).toBe(false);
      expect(security.authc.apiKeys.uiam).toBeNull();
      expect(security.authc.getPrincipal({} as never)).toBeNull();
      await services.stop();
    });

    it('clones an API key from the request through the internal user', async () => {
      const { services } = createServices();
      const request = jest.fn().mockResolvedValue({ id: 'id', name: 'n', api_key: 'k' });
      await setupServices(services, { transport: { request }, security: {}, child: jest.fn() });
      const { security } = await services.start();
      const result = await security.authc.apiKeys.cloneAsInternalUser(
        { headers: { authorization: 'ApiKey abc' } } as never,
        { name: 'n', metadata: { a: 1 } } as never
      );
      expect(result).toEqual({ id: 'id', name: 'n', api_key: 'k' });
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/_security/api_key/clone',
          body: { api_key: 'abc', name: 'n', metadata: { a: 1 }, expiration: null },
        })
      );
      await expect(
        security.authc.apiKeys.cloneAsInternalUser(
          { headers: { authorization: 'Bearer abc' } } as never,
          { name: 'n' } as never
        )
      ).rejects.toThrow(/expected ApiKey/);
      await services.stop();
    });
  });

  describe('user profile', () => {
    it('resolves the profile id of the enriched user, else of the request API key', async () => {
      const { services } = createServices();
      const getApiKey = jest.fn().mockResolvedValue({ api_keys: [{ profile_uid: 'u_key' }] });
      const child = jest.fn().mockReturnValue({ security: { getApiKey } });
      const { setup } = await setupServices(services, { child, security: {}, transport: {} });
      const { userProfile } = await services.start();

      const enriched = { headers: {} } as unknown as KibanaRequest;
      setup.enrichFakeRequest(enriched, { profileId: 'u_1' } as never);
      await expect(userProfile.getCurrentProfileId({ request: enriched })).resolves.toBe('u_1');

      const authorization = `ApiKey ${Buffer.from('keyid:secret').toString('base64')}`;
      await expect(
        userProfile.getCurrentProfileId({ request: { headers: { authorization } } as never })
      ).resolves.toBe('u_key');
      expect(getApiKey).toHaveBeenCalledWith({ id: 'keyid', with_profile_uid: true });

      await expect(
        userProfile.getCurrentProfileId({ request: { headers: {} } as never })
      ).resolves.toBeNull();
      await services.stop();
    });
  });

  describe('http', () => {
    it('uses Core base path and the server settings for the server info', () => {
      const { services } = createServices({
        server: { basePath: '/kbn', publicBaseUrl: 'https://k' },
      });
      expect(services.basePath.prepend('/app')).toBe('/kbn/app');
      expect(services.basePath.publicBaseUrl).toBe('https://k');
      expect(createServerInfo({ server: { host: 'h', port: 1 } })()).toEqual({
        name: 'kibana',
        protocol: 'http',
        hostname: 'h',
        port: 1,
      });
      expect(createServerInfo({})().port).toBe(5601);
    });
  });
});

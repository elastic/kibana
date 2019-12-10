/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Status, Policy } from '../../common/types/domain_data';
import { FrameworkUser, internalAuthData } from '../adapters/framework/adapter_types';
import { AgentPolicy } from '../repositories/policies/types';
import { PolicyLib } from './policy';

function getUser(apiKey?: string, apiKeyId?: string) {
  if (!apiKey) {
    return { kind: 'internal' } as FrameworkUser;
  }
  return ({
    kind: 'authenticated',
    [internalAuthData]: {
      headers: {
        authorization: `ApiKey ${Buffer.from(`${apiKeyId || 'key_id'}:${apiKey}`).toString(
          'base64'
        )}`,
      },
    },
  } as unknown) as FrameworkUser;
}
describe('Policies Lib', () => {
  describe('getWithAgentFormating', () => {
    it('Should return a policy with all datasource, formatted for agent', async () => {
      const repository: any = {
        getPolicyOutputByIDs: (_user: any, ids: string[]) => {
          return ids.map(id => {
            return {
              api_token: 'slfhsdlfhjjkshfkjh:sdfsdfsdfsdf',
              config: {
                tlsCert: 'ldsjfldsjfljsdalkfjl;ksadh;kjsdha;kjhslgkjhsdalkghasdkgh',
              },
              id,
              name: 'Default',
              type: 'elasticsearch',
              url: 'https://localhost:9200',
            };
          });
        },
        get: (_user: any, id: string) => {
          const policy: Policy = {
            id,
            name: 'Example Policy',
            datasources: [
              {
                name: 'prod_west',
                package: {
                  name: 'coredns',
                  version: '1.3.1',
                  description:
                    'CoreDNS logs and metrics integration.\nThe CoreDNS integrations allows to gather logs and metrics from the CoreDNS DNS server to get better insights.\n',
                  title: 'CoreDNS',
                  assets: [{ id: 'string', type: 'index-template' as any }],
                },
                streams: [
                  {
                    id: 'string',
                    input: {
                      type: 'etc' as any,
                      config: { paths: '/var/log/*.log' },
                      ingest_pipelines: ['string'],
                      id: 'string',
                      index_template: 'string',
                      ilm_policy: 'string',
                      fields: [{}],
                    },
                    config: { metricsets: ['container', 'cpu'] },
                    output_id: 'default',
                    processors: ['string'],
                  },
                ],
                id: 'string',
                read_alias: 'string',
              },
            ],
            updated_on: new Date().toISOString(),
            updated_by: 'username',
            description: 'string',
            status: Status.Active,
          };
          return policy;
        },
      };
      const policyLib = new PolicyLib(repository);

      const fullPolicy = (await policyLib.getFullPolicy(
        getUser(),
        'policy_example'
      )) as AgentPolicy;
      expect(fullPolicy.streams.length).toBe(1);
      expect(fullPolicy.streams[0].id).toBe('string');
      expect(fullPolicy).toMatchSnapshot();
    });
  });
});

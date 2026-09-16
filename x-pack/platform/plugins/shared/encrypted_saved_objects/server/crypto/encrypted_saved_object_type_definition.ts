/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';

import type { EncryptedSavedObjectTypeRegistration } from './encrypted_saved_objects_service';

/**
 * Synthetics monitor secrets, from `secretKeys` in the synthetics plugin.
 */
const SYNTHETICS_MONITOR_DOTTED_SECRET_KEYS = [
  'check.request.body',
  'check.request.headers',
  'check.send',
  'check.response.body.negative',
  'check.response.body.positive',
  'check.response.json',
  'check.response.headers',
  'check.receive',
  'source.inline.script',
  'source.project.content',
  'ssl.key',
  'ssl.key_passphrase',
];

/**
 * Synthetics monitor AAD attributes, from `attributesToIncludeInAAD` in the synthetics plugin.
 */
const SYNTHETICS_MONITOR_DOTTED_AAD_KEYS = [
  'service.name',
  'filter_journeys.match',
  'filter_journeys.tags',
  'url.port',
  'response.include_body',
  'response.include_headers',
  'response.include_body_max_bytes',
  'check.response.status',
  'check.request.method',
  'ssl.certificate_authorities',
  'ssl.certificate',
  'ssl.verification_mode',
  'ssl.supported_protocols',
];

/**
 * Config keys the legacy `synthetics-monitor` type carried before the zip-url source and the
 * standalone throttling fields were dropped. They stay in the AAD so objects written by those
 * versions still decrypt.
 */
const SYNTHETICS_MONITOR_DOTTED_LEGACY_KEYS = [
  'source.zip_url.url',
  'source.zip_url.username',
  'source.zip_url.password',
  'source.zip_url.folder',
  'source.zip_url.proxy_url',
  'source.zip_url.ssl.certificate_authorities',
  'source.zip_url.ssl.certificate',
  'source.zip_url.ssl.key',
  'source.zip_url.ssl.key_passphrase',
  'source.zip_url.ssl.verification_mode',
  'source.zip_url.ssl.supported_protocols',
  'throttling.config',
  'throttling.is_enabled',
  'throttling.download_speed',
  'throttling.upload_speed',
  'throttling.latency',
];

/**
 * Attribute keys containing a dot that are nonetheless legitimate, listed per saved object type.
 *
 * These are genuine flat top-level attribute names that happen to contain dots, matching the
 * heartbeat config key format used by the synthetics monitor types. Every permitted key is
 * spelled out rather than matched by prefix, so that a new dotted key is rejected even when it
 * sits under a prefix already in use here.
 *
 * This map should only ever shrink: it exists to grandfather in the types that predate the check
 * below, not to make room for new ones.
 */
const TYPES_WITH_DOTTED_ATTRIBUTE_KEYS: Readonly<Record<string, ReadonlySet<string>>> = {
  'synthetics-monitor': new Set([
    ...SYNTHETICS_MONITOR_DOTTED_SECRET_KEYS,
    ...SYNTHETICS_MONITOR_DOTTED_AAD_KEYS,
    ...SYNTHETICS_MONITOR_DOTTED_LEGACY_KEYS,
  ]),
  'synthetics-monitor-multi-space': new Set([
    ...SYNTHETICS_MONITOR_DOTTED_SECRET_KEYS,
    ...SYNTHETICS_MONITOR_DOTTED_AAD_KEYS,
  ]),
};

/**
 * Rejects attribute keys containing a dot.
 *
 * Attributes are looked up by flat key (`attributes[key]`), so `'ssl.key'` names a top-level
 * attribute literally called `ssl.key` — it does not reach the nested path `attributes.ssl.key`.
 * A dotted key that was meant as a path therefore fails silently in the worst possible way: the
 * value is never encrypted, or it quietly drops out of the AAD.
 *
 * Failing registration is deliberate. There is no way to express "encrypt a nested field", so a
 * dotted key is either a genuine flat attribute name — in which case it belongs in the map above
 * — or a bug that would otherwise ship unnoticed.
 */
function assertNoUnexpectedDottedKeys(typeRegistration: EncryptedSavedObjectTypeRegistration) {
  const allowed = TYPES_WITH_DOTTED_ATTRIBUTE_KEYS[typeRegistration.type];

  const dottedKeys = [
    ...Array.from(typeRegistration.attributesToEncrypt, (attribute) =>
      typeof attribute === 'string' ? attribute : attribute.key
    ),
    ...(typeRegistration.attributesToIncludeInAAD ?? []),
  ].filter((key) => key.includes('.') && !allowed?.has(key));

  if (dottedKeys.length > 0) {
    throw new Error(
      `Invalid EncryptedSavedObjectTypeRegistration for type '${typeRegistration.type}'. ` +
        `Attribute keys are matched as flat top-level attribute names, not as nested paths, ` +
        `so these keys would not encrypt the nested values they appear to name: ${[
          ...new Set(dottedKeys),
        ].join(', ')}`
    );
  }
}

/**
 * Represents the definition of the attributes of the specific saved object that are supposed to be
 * encrypted. The definition also dictates which attributes should be included in AAD and/or
 * stripped from response.
 */
export class EncryptedSavedObjectAttributesDefinition {
  public readonly attributesToEncrypt: ReadonlySet<string>;
  public readonly attributesToIncludeInAAD: ReadonlySet<string> | undefined;
  private readonly attributesToStrip: ReadonlySet<string>;
  public readonly enforceRandomId: boolean;

  constructor(typeRegistration: EncryptedSavedObjectTypeRegistration) {
    assertNoUnexpectedDottedKeys(typeRegistration);

    if (typeRegistration.attributesToIncludeInAAD) {
      const invalidAttributeKeys = new Array<string>();
      typeRegistration.attributesToEncrypt.forEach((attribute) => {
        const attributeKey = typeof attribute !== 'string' ? attribute.key : attribute;
        if (typeRegistration.attributesToIncludeInAAD?.has(attributeKey)) {
          invalidAttributeKeys.push(attributeKey);
        }
      });

      if (invalidAttributeKeys.length > 0) {
        throw new Error(
          `Invalid EncryptedSavedObjectTypeRegistration for type '${typeRegistration.type}'. ` +
            `attributesToIncludeInAAD must not contain any values in attributesToEncrypt: ${invalidAttributeKeys}`
        );
      }
    }

    const attributesToEncrypt = new Set<string>();
    const attributesToStrip = new Set<string>();
    for (const attribute of typeRegistration.attributesToEncrypt) {
      if (typeof attribute === 'string') {
        attributesToEncrypt.add(attribute);
        attributesToStrip.add(attribute);
      } else {
        attributesToEncrypt.add(attribute.key);
        if (!attribute.dangerouslyExposeValue) {
          attributesToStrip.add(attribute.key);
        }
      }
    }

    this.enforceRandomId = typeRegistration.enforceRandomId !== false;

    this.attributesToEncrypt = attributesToEncrypt;
    this.attributesToStrip = attributesToStrip;
    this.attributesToIncludeInAAD = typeRegistration.attributesToIncludeInAAD;
  }

  /**
   * Determines whether particular attribute should be encrypted. Full list of attributes that
   * should be encrypted can be retrieved via `attributesToEncrypt` property.
   * @param attributeName Name of the attribute.
   */
  public shouldBeEncrypted(attributeName: string) {
    return this.attributesToEncrypt.has(attributeName);
  }

  /**
   * Determines whether particular attribute should be included in AAD.
   * @param attributeName Name of the attribute.
   */
  public shouldBeIncludedInAAD(attributeName: string) {
    return (
      !this.shouldBeEncrypted(attributeName) &&
      this.attributesToIncludeInAAD != null &&
      this.attributesToIncludeInAAD.has(attributeName)
    );
  }

  /**
   * Determines whether particular attribute should be stripped from the attribute list.
   * @param attributeName Name of the attribute.
   */
  public shouldBeStripped(attributeName: string) {
    return this.attributesToStrip.has(attributeName);
  }

  /**
   * Collects all attributes (both keys and values) that should contribute to AAD.
   * @param attributes Attributes of the saved object
   */
  public collectAttributesForAAD(attributes: Record<string, unknown>) {
    const aadAttributes: Record<string, unknown> = {};
    if (this.attributesToIncludeInAAD) {
      for (const attributeKey of this.attributesToIncludeInAAD) {
        if (!this.shouldBeEncrypted(attributeKey) && Object.hasOwn(attributes, attributeKey)) {
          aadAttributes[attributeKey] = attributes[attributeKey];
        }
      }
    }
    return aadAttributes;
  }

  /**
   * Gets a unique hash value based on the ESO type properties
   * @param typeName optional name of the type.
   * @returns string - unique hash for the eso definition, including name if provided
   */
  public getDefinitionHash(typeName?: string) {
    const hash = createHash('sha256');
    const globalData = [
      ...(typeName ? [typeName] : []),
      ...Array.from(this.attributesToEncrypt),
      ...Array.from(this.attributesToIncludeInAAD ?? []),
      this.enforceRandomId.toString(),
    ].join('|');
    return hash.update(globalData).digest('hex');
  }
}

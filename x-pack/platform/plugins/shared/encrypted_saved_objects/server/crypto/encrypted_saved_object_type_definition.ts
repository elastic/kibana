/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectTypeRegistration } from './encrypted_saved_objects_service';

/**
 * Represents the definition of the attributes of the specific saved object that are supposed to be
 * encrypted. The definition also dictates which attributes should be included in AAD and/or
 * stripped from response.
 */
export class EncryptedSavedObjectAttributesDefinition {
  public readonly attributesToEncrypt: ReadonlySet<string>;
  private readonly attributesToIncludeInAAD: ReadonlySet<string> | undefined;
  private readonly attributesToStrip: ReadonlySet<string>;
  public readonly enforceRandomId: boolean;

  constructor(typeRegistration: EncryptedSavedObjectTypeRegistration) {
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
}

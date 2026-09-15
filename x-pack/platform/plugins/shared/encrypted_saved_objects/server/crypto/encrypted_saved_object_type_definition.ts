/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';

import type { EncryptedSavedObjectTypeRegistration } from './encrypted_saved_objects_service';

/**
 * Represents the definition of the attributes of the specific saved object that are supposed to be
 * encrypted. The definition also dictates which attributes should be included in AAD and/or
 * stripped from response.
 *
 * All attribute names are top-level names, compared to the keys of the saved object's `attributes`
 * with an exact string match. A dot in a name is not treated as a path and is never resolved into
 * a nested attribute.
 */
export class EncryptedSavedObjectAttributesDefinition {
  public readonly attributesToEncrypt: ReadonlySet<string>;
  public readonly attributesToIncludeInAAD: ReadonlySet<string> | undefined;
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
   * @param attributeName Name of the top-level attribute. Matched exactly; dotted paths are not
   * resolved. If the attribute name contains a dot, it is treated as a literal key and not as a
   * path into a nested attribute.
   */
  public shouldBeEncrypted(attributeName: string) {
    return this.attributesToEncrypt.has(attributeName);
  }

  /**
   * Determines whether particular attribute should be included in AAD.
   * @param attributeName Name of the top-level attribute. Matched exactly; dotted paths are not
   * resolved. If the attribute name contains a dot, it is treated as a literal key and not as a
   * path into a nested attribute. Subfields of an included attribute are covered by its value.
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
   * @param attributeName Name of the top-level attribute. Matched exactly; dotted paths are not
   * resolved, so a dotted path that is not a literal attribute key is never stripped.
   */
  public shouldBeStripped(attributeName: string) {
    return this.attributesToStrip.has(attributeName);
  }

  /**
   * Collects all attributes (both keys and values) that should contribute to AAD. Only top-level
   * attributes that are actually present on the object are collected; a registered name that is
   * not a key of `attributes` (for example, a dotted path into a nested attribute) is silently
   * omitted from AAD.
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

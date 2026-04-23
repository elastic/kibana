/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const extractAttributeValue = (xmlDocument: string, attributeName: string) => {
  const [, attributeValue] =
    xmlDocument.match(
      new RegExp(
        `Name="${attributeName}"[\\s\\S]*?<saml:AttributeValue[^>]*>([\\s\\S]*?)<\\/saml:AttributeValue>`
      )
    ) ?? [];
  if (!attributeValue) {
    throw new Error(`Attribute ${attributeName} isn't found in SAML response.`);
  }
  return attributeValue.trim();
};

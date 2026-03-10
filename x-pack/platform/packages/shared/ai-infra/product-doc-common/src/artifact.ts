/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isImpliedDefaultElserInferenceId } from './is_default_inference_endpoint';
import { type ProductName, DocumentationProduct } from './product';

const allowedProductNames: ProductName[] = Object.values(DocumentationProduct);

export const DEFAULT_ELSER = '.elser-2-elasticsearch';

export const getArtifactName = ({
  productName,
  productVersion,
  excludeExtension = false,
  inferenceId,
}: {
  productName: ProductName;
  productVersion: string;
  excludeExtension?: boolean;
  inferenceId?: string;
}): string => {
  const ext = excludeExtension ? '' : '.zip';
  return `kb-product-doc-${productName}-${productVersion}${
    inferenceId && !isImpliedDefaultElserInferenceId(inferenceId) ? `--${inferenceId}` : ''
  }${ext}`.toLowerCase();
};

export const parseArtifactName = (artifactName: string) => {
  // drop ".zip" (if any)
  let name = artifactName.endsWith('.zip') ? artifactName.slice(0, -4) : artifactName;

  // pull off the final  "--<inferenceId>" (if present)
  let inferenceId: string | undefined;
  const lastDashDash = name.lastIndexOf('--');
  if (lastDashDash !== -1) {
    inferenceId = name.slice(lastDashDash + 2);
    name = name.slice(0, lastDashDash); // strip it for the base match
  }

  // match the main pattern kb-product-doc-<product>-<version>
  const match = name.match(/^kb-product-doc-([a-z]+)-([0-9]+\.[0-9]+)$/);
  if (!match) return;

  const productName = match[1].toLowerCase() as ProductName;
  const productVersion = match[2].toLowerCase();

  if (!allowedProductNames.includes(productName)) return;

  return {
    productName,
    productVersion,
    ...(inferenceId ? { inferenceId } : {}),
  };
};

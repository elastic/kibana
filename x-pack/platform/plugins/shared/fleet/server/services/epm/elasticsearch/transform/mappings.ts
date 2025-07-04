/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AssetsMap, PackageInstallContext } from '../../../../../common/types/models';
import { loadTransformFieldsFromYaml, processFields } from '../../fields/field';
import { generateMappings } from '../template/template';

export function loadMappingForTransform(
  packageInstallContext: PackageInstallContext,
  fieldAssetsMap: AssetsMap,
  transformModuleId: string
) {
  const fields = loadTransformFieldsFromYaml(
    packageInstallContext,
    fieldAssetsMap,
    transformModuleId
  );
  const validFields = processFields(fields);
  return generateMappings(validFields);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type {
  FindFileStructureResponse,
  IngestPipeline,
} from '@kbn/file-upload-plugin/common/types';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import { i18n } from '@kbn/i18n';
import type { HttpSetup } from '@kbn/core/public';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IMPORT_STATUS } from '../import_progress/import_progress';
import { AutoDeploy } from './auto_deploy';

interface Props {
  data: ArrayBuffer;
  results: FindFileStructureResponse;
  dataViewsContract: DataViewsServicePublic;
  fileUpload: FileUploadStartApi;
  http: HttpSetup;
}

interface Config {
  index: string;
  dataView: string;
  createDataView: boolean;
  indexSettingsString: string;
  mappingsString: string;
  pipelineString: string;
  pipelineId: string | null;
  createPipeline: boolean;
}

export async function importData(props: Props, config: Config, setState: (state: unknown) => void) {
  const { data, results, dataViewsContract, fileUpload, http } = props;
  const {
    index,
    dataView,
    createDataView,
    indexSettingsString,
    mappingsString,
    pipelineString,
    pipelineId,
    createPipeline,
  } = config;
  const { format } = results;

  const errors = [];

  if (index === '') {
    return;
  }

  if (
    (await fileUpload.hasImportPermission({
      checkCreateDataView: createDataView,
      checkHasManagePipeline: true,
      indexName: index,
    })) === false
  ) {
    errors.push(
      i18n.translate('xpack.dataVisualizer.file.importView.importPermissionError', {
        defaultMessage: 'You do not have permission to create or import data into index {index}.',
        values: {
          index,
        },
      })
    );
    setState({
      permissionCheckStatus: IMPORT_STATUS.FAILED,
      importing: false,
      imported: false,
      errors,
    });
    return;
  }

  let success = true;

  let settings = {};
  let mappings = {};
  let pipeline;

  try {
    settings = JSON.parse(indexSettingsString);
  } catch (error) {
    success = false;
    const parseError = i18n.translate('xpack.dataVisualizer.file.importView.parseSettingsError', {
      defaultMessage: 'Error parsing settings:',
    });
    errors.push(`${parseError} ${error.message}`);
  }

  try {
    mappings = JSON.parse(mappingsString);
  } catch (error) {
    success = false;
    const parseError = i18n.translate('xpack.dataVisualizer.file.importView.parseMappingsError', {
      defaultMessage: 'Error parsing mappings:',
    });
    errors.push(`${parseError} ${error.message}`);
  }

  try {
    if (createPipeline) {
      pipeline = JSON.parse(pipelineString) as IngestPipeline;
    }
  } catch (error) {
    success = false;
    const parseError = i18n.translate('xpack.dataVisualizer.file.importView.parsePipelineError', {
      defaultMessage: 'Error parsing ingest pipeline:',
    });
    errors.push(`${parseError} ${error.message}`);
  }

  const inferenceId = getInferenceId(mappings);

  setState({
    importing: true,
    imported: false,
    reading: true,
    initialized: true,
    permissionCheckStatus: IMPORT_STATUS.COMPLETE,
    initializeDeployment: inferenceId !== null,
    parseJSONStatus: getSuccess(success),
  });

  if (success === false) {
    return;
  }

  const importer = await fileUpload.importerFactory(format, {
    excludeLinesPattern: results.exclude_lines_pattern,
    multilineStartPattern: results.multiline_start_pattern,
  });

  const readResp = importer.read(data);
  success = readResp.success;
  setState({
    readStatus: getSuccess(success),
    reading: false,
    importer,
  });

  if (success === false) {
    return;
  }

  if (inferenceId) {
    // Initialize deployment
    const autoDeploy = new AutoDeploy(http, inferenceId);

    try {
      await autoDeploy.deploy();
      setState({
        initializeDeploymentStatus: IMPORT_STATUS.COMPLETE,
        inferenceId,
      });
    } catch (error) {
      success = false;
      const deployError = i18n.translate('xpack.dataVisualizer.file.importView.deployModelError', {
        defaultMessage: 'Error deploying trained model:',
      });
      errors.push(`${deployError} ${error.message}`);
      setState({
        initializeDeploymentStatus: IMPORT_STATUS.FAILED,
        errors,
      });
    }
  }

  if (success === false) {
    return;
  }

  const initializeImportResp = await importer.initializeImport(index, settings, mappings, pipeline);

  if (initializeImportResp.success === false) {
    errors.push(initializeImportResp.error);
    setState({
      initializeImportStatus: IMPORT_STATUS.FAILED,
      errors,
    });
    return;
  }

  const timeFieldName = importer.getTimeField();
  setState({ timeFieldName });

  const indexCreated = initializeImportResp.index !== undefined;
  setState({
    indexCreatedStatus: getSuccess(indexCreated),
  });

  if (createPipeline) {
    const pipelineCreated = initializeImportResp.pipelineId !== undefined;
    if (indexCreated) {
      setState({
        ingestPipelineCreatedStatus: pipelineCreated
          ? IMPORT_STATUS.COMPLETE
          : IMPORT_STATUS.FAILED,
        pipelineId: pipelineCreated ? initializeImportResp.pipelineId : '',
      });
    }
    success = indexCreated && pipelineCreated;
  } else {
    success = indexCreated;
  }

  if (success === false) {
    errors.push(initializeImportResp.error);
    return;
  }

  const importResp = await importer.import(
    initializeImportResp.id,
    index,
    pipelineId ?? initializeImportResp.pipelineId,
    (progress: number) => {
      setState({
        uploadProgress: progress,
      });
    }
  );
  success = importResp.success;
  setState({
    uploadStatus: getSuccess(importResp.success),
    importFailures: importResp.failures,
    docCount: importResp.docCount,
  });

  if (success === false) {
    errors.push(importResp.error);
    return;
  }

  if (createDataView) {
    const dataViewName = dataView === '' ? index : dataView;
    const dataViewResp = await createKibanaDataView(dataViewName, dataViewsContract, timeFieldName);
    success = dataViewResp.success;
    setState({
      dataViewCreatedStatus: dataViewResp.success ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED,
      dataViewId: dataViewResp.id,
    });
    if (success === false) {
      errors.push(dataViewResp.error);
    }
  }

  setState({
    importing: false,
    imported: success,
    errors,
  });
}

export async function createKibanaDataView(
  dataViewName: string,
  dataViewsContract: DataViewsServicePublic,
  timeFieldName?: string
) {
  try {
    const emptyPattern = await dataViewsContract.createAndSave({
      title: dataViewName,
      timeFieldName,
    });

    return {
      success: true,
      id: emptyPattern.id,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

function getSuccess(success: boolean) {
  return success ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.FAILED;
}

export function getInferenceId(mappings: MappingTypeMapping) {
  for (const value of Object.values(mappings.properties ?? {})) {
    if (value.type === 'semantic_text') {
      return value.inference_id;
    }
  }
  return null;
}

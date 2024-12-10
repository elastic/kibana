/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isEmpty } from 'lodash';
import { JsonEditorWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import type { OpsgenieCreateAlertParams } from '../../../../server/connector_types';
import * as i18n from './translations';
import { CreateAlertProps } from '.';
import { decodeCreateAlert } from './schema';
import { isDecodeError } from '../schema_utils';

export type JsonEditorProps = Pick<
  CreateAlertProps,
  'editAction' | 'index' | 'messageVariables' | 'subActionParams'
>;

const JsonEditorComponent: React.FC<JsonEditorProps> = ({
  editAction,
  index,
  messageVariables,
  subActionParams,
}) => {
  const [jsonEditorErrors, setJsonEditorErrors] = useState<string[]>([]);

  const jsonEditorValue = useMemo(() => getJsonEditorValue(subActionParams), [subActionParams]);

  const decodeJsonWithSchema = useCallback((jsonBlob: unknown) => {
    try {
      const decodedValue = decodeCreateAlert(jsonBlob);
      setJsonEditorErrors([]);
      return decodedValue;
    } catch (error) {
      if (isDecodeError(error)) {
        setJsonEditorErrors(error.decodeErrors);
      } else {
        setJsonEditorErrors([error.message]);
      }

      return;
    }
  }, []);

  const onAdvancedEditorChange = useCallback(
    (json: string) => {
      const parsedJson = parseJson(json);
      if (!parsedJson) {
        editAction('jsonEditorError', true, index);

        return;
      }

      const decodedValue = decodeJsonWithSchema(parsedJson);
      if (!decodedValue) {
        editAction('jsonEditorError', true, index);

        return;
      }

      editAction('subActionParams', decodedValue, index);
    },
    [editAction, index, decodeJsonWithSchema]
  );

  useEffect(() => {
    // show the initial error messages
    const decodedValue = decodeJsonWithSchema(subActionParams ?? {});
    if (!decodedValue) {
      editAction('jsonEditorError', true, index);
    } else {
      // must mark as undefined to remove the field so it is not sent to the server side
      editAction('jsonEditorError', undefined, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subActionParams, decodeJsonWithSchema, index]);

  return (
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'subActionParams'}
      inputTargetValue={jsonEditorValue}
      ariaLabel={i18n.JSON_EDITOR_ARIA}
      onDocumentsChange={onAdvancedEditorChange}
      errors={jsonEditorErrors}
      label={i18n.ALERT_FIELDS_LABEL}
      dataTestSubj="actionJsonEditor"
    />
  );
};

JsonEditorComponent.displayName = 'JsonEditor';

const JsonEditor = React.memo(JsonEditorComponent);

// eslint-disable-next-line import/no-default-export
export { JsonEditor as default };

const parseJson = (jsonValue: string): Record<string, unknown> | undefined => {
  try {
    return JSON.parse(jsonValue);
  } catch (error) {
    return;
  }
};

const getJsonEditorValue = (subActionParams?: Partial<OpsgenieCreateAlertParams>) => {
  const defaultValue = '{}';
  try {
    const value = JSON.stringify(subActionParams, null, 2);
    if (isEmpty(value)) {
      return defaultValue;
    }
    return value;
  } catch (error) {
    return defaultValue;
  }
};

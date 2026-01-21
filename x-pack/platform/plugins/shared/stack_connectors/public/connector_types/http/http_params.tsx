/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { JsonEditorWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  type EuiSelectOption,
} from '@elastic/eui';
import { HTTP_METHODS, type ActionParamsType, type HttpMethod } from '@kbn/connector-schemas/http';

const HTTP_METHOD_OPTIONS: EuiSelectOption[] = HTTP_METHODS.map((method) => ({
  value: method,
  text: method,
}));

const methodExpectsBody = (method: HttpMethod): boolean => {
  return !['GET', 'DELETE'].includes(method);
};

interface KeyValuePair {
  key: string;
  value: string;
}

const HttpParamsFields: React.FunctionComponent<ActionParamsProps<ActionParamsType>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { path, method = 'GET', body, query, headers } = actionParams;

  const [queryParams, setQueryParams] = useState<KeyValuePair[]>(() => {
    if (!query) return [{ key: '', value: '' }];
    return Object.entries(query).map(([key, value]) => ({ key, value }));
  });

  const [headerParams, setHeaderParams] = useState<KeyValuePair[]>(() => {
    if (!headers) return [{ key: '', value: '' }];
    return Object.entries(headers).map(([key, value]) => ({ key, value }));
  });

  const lastQueryRef = useRef<string>('');
  const lastHeadersRef = useRef<string>('');

  // Sync query params with actionParams
  useEffect(() => {
    const queryRecord: Record<string, string> = {};
    queryParams.forEach(({ key, value }) => {
      if (key && key.trim()) {
        queryRecord[key] = value || '';
      }
    });
    const queryString = JSON.stringify(queryRecord);
    if (queryString !== lastQueryRef.current) {
      lastQueryRef.current = queryString;
      const hasQuery = Object.keys(queryRecord).length > 0;
      editAction('query', hasQuery ? queryRecord : undefined, index);
    }
  }, [queryParams, editAction, index]);

  // Sync header params with actionParams
  useEffect(() => {
    const headersRecord: Record<string, string> = {};
    headerParams.forEach(({ key, value }) => {
      if (key && key.trim()) {
        headersRecord[key] = value || '';
      }
    });
    const headersString = JSON.stringify(headersRecord);
    if (headersString !== lastHeadersRef.current) {
      lastHeadersRef.current = headersString;
      const hasHeaders = Object.keys(headersRecord).length > 0;
      editAction('headers', hasHeaders ? headersRecord : undefined, index);
    }
  }, [headerParams, editAction, index]);

  const updateQueryParam = (idx: number, field: 'key' | 'value', value: string) => {
    const newParams = [...queryParams];
    newParams[idx] = { ...newParams[idx], [field]: value };
    setQueryParams(newParams);
  };

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '' }]);
  };

  const removeQueryParam = (idx: number) => {
    const newParams = queryParams.filter((_, i) => i !== idx);
    setQueryParams(newParams.length > 0 ? newParams : [{ key: '', value: '' }]);
  };

  const updateHeaderParam = (idx: number, field: 'key' | 'value', value: string) => {
    const newParams = [...headerParams];
    newParams[idx] = { ...newParams[idx], [field]: value };
    setHeaderParams(newParams);
  };

  const addHeader = () => {
    setHeaderParams([...headerParams, { key: '', value: '' }]);
  };

  const removeHeader = (idx: number) => {
    const newParams = headerParams.filter((_, i) => i !== idx);
    setHeaderParams(newParams.length > 0 ? newParams : [{ key: '', value: '' }]);
  };

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.stackConnectors.components.http.pathFieldLabel', {
              defaultMessage: 'Path',
            })}
            fullWidth
            error={errors.path as string}
            isInvalid={Boolean(errors.path?.length)}
          >
            <EuiFieldText
              isInvalid={Boolean(errors.path?.length)}
              fullWidth
              value={path || ''}
              onChange={(e) => {
                editAction('path', e.target.value || undefined, index);
              }}
              placeholder="/api/v1/users"
              data-test-subj="httpPathInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.stackConnectors.components.http.methodFieldLabel', {
              defaultMessage: 'Method',
            })}
            fullWidth
            error={errors.method as string}
            isInvalid={Boolean(errors.method?.length)}
          >
            <EuiSelect
              isInvalid={Boolean(errors.method?.length)}
              fullWidth
              options={HTTP_METHOD_OPTIONS}
              value={method}
              onChange={(e) => {
                editAction('method', e.target.value, index);
              }}
              data-test-subj="httpMethodSelect"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <JsonEditorWithMessageVariables
        messageVariables={messageVariables}
        isOptionalField={!methodExpectsBody(method)}
        paramsProperty={'body'}
        inputTargetValue={body}
        label={i18n.translate('xpack.stackConnectors.components.http.bodyFieldLabel', {
          defaultMessage: 'Body',
        })}
        ariaLabel={i18n.translate('xpack.stackConnectors.components.http.bodyCodeEditorAriaLabel', {
          defaultMessage: 'Body code editor',
        })}
        errors={errors.body as string[]}
        onDocumentsChange={(json: string) => {
          editAction('body', json || undefined, index);
        }}
        onBlur={() => {
          if (!body) {
            editAction('body', undefined, index);
          }
        }}
        dataTestSubj="httpBodyJsonEditor"
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.stackConnectors.components.http.queryParamsTitle', {
                defaultMessage: 'Query Parameters',
              })}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plusInCircle"
            onClick={addQueryParam}
            data-test-subj="httpQueryAddButton"
            size="s"
          >
            {i18n.translate('xpack.stackConnectors.components.http.addQueryParam', {
              defaultMessage: 'Add',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {queryParams.map((param, idx) => (
        <EuiFlexGroup key={idx} gutterSize="s">
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.stackConnectors.components.http.queryKeyLabel', {
                defaultMessage: 'Key',
              })}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                value={param.key}
                onChange={(e) => updateQueryParam(idx, 'key', e.target.value)}
                placeholder="param"
                data-test-subj={`httpQueryKeyInput-${idx}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.stackConnectors.components.http.queryValueLabel', {
                defaultMessage: 'Value',
              })}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                value={param.value}
                onChange={(e) => updateQueryParam(idx, 'value', e.target.value)}
                placeholder="value"
                data-test-subj={`httpQueryValueInput-${idx}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                onClick={() => removeQueryParam(idx)}
                aria-label={i18n.translate(
                  'xpack.stackConnectors.components.http.removeQueryParam',
                  {
                    defaultMessage: 'Remove query parameter',
                  }
                )}
                data-test-subj={`httpQueryRemoveButton-${idx}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.stackConnectors.components.http.headersTitle', {
                defaultMessage: 'Headers',
              })}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plusInCircle"
            onClick={addHeader}
            data-test-subj="httpHeaderAddButton"
            size="s"
          >
            {i18n.translate('xpack.stackConnectors.components.http.addHeader', {
              defaultMessage: 'Add',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {headerParams.map((header, idx) => (
        <EuiFlexGroup key={idx} gutterSize="s">
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.stackConnectors.components.http.headerKeyLabel', {
                defaultMessage: 'Key',
              })}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                value={header.key}
                onChange={(e) => updateHeaderParam(idx, 'key', e.target.value)}
                placeholder="X-Custom-Header"
                data-test-subj={`httpHeaderKeyInput-${idx}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.stackConnectors.components.http.headerValueLabel', {
                defaultMessage: 'Value',
              })}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                value={header.value}
                onChange={(e) => updateHeaderParam(idx, 'value', e.target.value)}
                placeholder="value"
                data-test-subj={`httpHeaderValueInput-${idx}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                onClick={() => removeHeader(idx)}
                aria-label={i18n.translate('xpack.stackConnectors.components.http.removeHeader', {
                  defaultMessage: 'Remove header',
                })}
                data-test-subj={`httpHeaderRemoveButton-${idx}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { HttpParamsFields as default };

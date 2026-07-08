/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
} from '@elastic/eui';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION, type WorkdayActionParams } from '@kbn/connector-schemas/workday';
import * as i18n from './translations';

const actionOptions = [
  { value: SUB_ACTION.GET_WORKER, inputDisplay: i18n.GET_WORKER_LABEL },
  { value: SUB_ACTION.SEARCH_WORKERS, inputDisplay: i18n.SEARCH_WORKERS_LABEL },
];

interface GetWorkerParams {
  workerId?: string;
}
interface SearchWorkersParams {
  search?: string;
  limit?: number;
  offset?: number;
}

const WorkdayParamsFields: React.FunctionComponent<ActionParamsProps<WorkdayActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const subAction = actionParams.subAction ?? SUB_ACTION.GET_WORKER;

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', SUB_ACTION.GET_WORKER, index);
    }
    if (!actionParams.subActionParams) {
      editAction('subActionParams', { workerId: '' } as GetWorkerParams, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  const onActionChange = useCallback(
    (value: SUB_ACTION) => {
      editAction('subAction', value, index);
      editAction(
        'subActionParams',
        value === SUB_ACTION.GET_WORKER
          ? ({ workerId: '' } as GetWorkerParams)
          : ({ search: '' } as SearchWorkersParams),
        index
      );
    },
    [editAction, index]
  );

  const getWorkerParams = useMemo(
    () => (actionParams.subActionParams as GetWorkerParams | undefined) ?? { workerId: '' },
    [actionParams.subActionParams]
  );

  const searchWorkersParams = useMemo(
    () =>
      (actionParams.subActionParams as SearchWorkersParams | undefined) ?? {
        search: '',
      },
    [actionParams.subActionParams]
  );

  const setGetWorker = (patch: Partial<GetWorkerParams>) =>
    editAction('subActionParams', { ...getWorkerParams, ...patch }, index);
  const setSearch = (patch: Partial<SearchWorkersParams>) =>
    editAction('subActionParams', { ...searchWorkersParams, ...patch }, index);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFormRow fullWidth label={i18n.ACTION_TYPE_LABEL}>
          <EuiSuperSelect
            fullWidth
            options={actionOptions}
            valueOfSelected={subAction}
            onChange={onActionChange}
            data-test-subj="workdayActionTypeSelect"
          />
        </EuiFormRow>
      </EuiFlexItem>

      {subAction === SUB_ACTION.GET_WORKER && (
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.WORKER_ID_LABEL}
            isInvalid={(errors['subActionParams.workerId'] as string[])?.length > 0}
            error={errors['subActionParams.workerId'] as string[]}
          >
            <EuiFieldText
              isInvalid={(errors['subActionParams.workerId'] as string[])?.length > 0}
              fullWidth
              value={getWorkerParams.workerId ?? ''}
              onChange={(e) => setGetWorker({ workerId: e.target.value })}
              data-test-subj="workdayWorkerIdInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
      )}

      {subAction === SUB_ACTION.SEARCH_WORKERS && (
        <>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={i18n.SEARCH_LABEL}
              helpText={i18n.SEARCH_HELP}
              isInvalid={(errors['subActionParams.search'] as string[])?.length > 0}
              error={errors['subActionParams.search'] as string[]}
            >
              <EuiFieldText
                isInvalid={(errors['subActionParams.search'] as string[])?.length > 0}
                fullWidth
                value={searchWorkersParams.search ?? ''}
                onChange={(e) => setSearch({ search: e.target.value })}
                data-test-subj="workdaySearchInput"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow label={i18n.LIMIT_LABEL}>
                  <EuiFieldNumber
                    min={1}
                    max={100}
                    value={searchWorkersParams.limit ?? ''}
                    onChange={(e) =>
                      setSearch({
                        limit: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    data-test-subj="workdayLimitInput"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow label={i18n.OFFSET_LABEL}>
                  <EuiFieldNumber
                    min={0}
                    value={searchWorkersParams.offset ?? ''}
                    onChange={(e) =>
                      setSearch({
                        offset: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    data-test-subj="workdayOffsetInput"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { WorkdayParamsFields as default };

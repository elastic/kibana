/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { FieldErrors } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { useForm as useHookForm, FormProvider } from 'react-hook-form';
import { map, omit, pickBy } from 'lodash';

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { isEmptyOrAllPlatforms } from '../../../common/platform';
import { isPackQueryEnabled, resolveEffectiveQueryExecution } from '../../../common/pack_execution';
import { usePack } from '../../packs/use_pack';
import { QueryPackSelectable } from '../../live_queries/form/query_pack_selectable';
import { useKibana } from '../../common/lib/kibana';
import LiveQueryQueryField from '../../live_queries/form/live_query_query_field';
import { PackFieldWrapper } from './pack_field_wrapper';

/**
 * A pack query as persisted onto the rule's response action.
 *
 * This mirrors the `OsqueryQuery` wire schema in security_solution
 * (`rule_response_actions/response_actions.schema.yaml`), which is the
 * contract the saved rule is validated against. Fields are carried through
 * from the pack rather than recomputed: the response action is stored on the
 * rule and replayed at alert time, so anything dropped here is lost from the
 * execution request for dynamic-parameter packs.
 */
interface OsqueryResponseActionQuery {
  id: string;
  ecs_mapping: ECSMapping;
  query: string;
  interval?: number;
  platform?: string;
  version?: string;
  snapshot?: boolean;
  removed?: boolean;
  timeout?: number;
}

interface OsqueryResponseActionsValues {
  savedQueryId?: string | null;
  id?: string;
  ecsMapping?: ECSMapping;
  query?: string;
  timeout: number;
  packId?: string;
  queries?: OsqueryResponseActionQuery[];
}

interface OsqueryResponseActionsParamsFormFields {
  savedQueryId: string | null;
  ecs_mapping: ECSMapping;
  timeout: number;
  query: string;
  packId?: string[];
  queries: OsqueryResponseActionQuery[];
  queryType: 'query' | 'pack';
}

export interface OsqueryResponseActionsParamsFormProps {
  defaultValues?: OsqueryResponseActionsValues;
  onChange: (data: OsqueryResponseActionsValues) => void;
  onError: (error: FieldErrors<OsqueryResponseActionsParamsFormFields>) => void;
}

const OsqueryResponseActionParamsFormComponent = ({
  defaultValues,
  onError,
  onChange,
}: OsqueryResponseActionsParamsFormProps) => {
  const hooksForm = useHookForm<OsqueryResponseActionsParamsFormFields>({
    mode: 'all',
    defaultValues: defaultValues
      ? {
          ...omit(defaultValues, ['ecsMapping', 'packId']),
          ecs_mapping: defaultValues.ecsMapping,
          packId: defaultValues.packId ? [defaultValues.packId] : [],
          queryType: defaultValues.packId ? 'pack' : 'query',
        }
      : {
          ecs_mapping: {},
          queryType: 'query',
        },
  });

  const { watch, register, formState, control } = hooksForm;

  const [packId, queryType, queries] = watch(['packId', 'queryType', 'queries']);
  const { data: packData } = usePack({
    packId: packId?.[0],
    skip: !packId?.[0],
  });

  const { replace } = useFieldArray({
    name: 'queries',
    control,
  });

  useEffect(() => {
    if (packData?.queries) {
      // Carry through every field the `OsqueryQuery` wire schema accepts, and
      // resolve pack-level execution defaults while doing so.
      //
      // The read-pack API returns `platform` / `min_osquery_version` at the
      // pack level, and only emits the per-query value when that query really
      // overrides it (`convertSOQueriesToPack` strips an absent or all-OS
      // platform). A plain passthrough would persist `undefined` for every
      // inheriting query and lose the pack default in the form's display.
      //
      // Uses the server's `resolveEffectiveQueryExecution` directly rather
      // than re-deriving the precedence rule, so this path cannot drift from
      // the scheduled Fleet emit and the live-query path. Disabled queries are
      // filtered with the same shared predicate the server applies.
      const queriesArray = map(
        pickBy(packData.queries, isPackQueryEnabled),
        (query, queryId: string) => {
          const { version: effectiveVersion, platform: effectivePlatform } =
            resolveEffectiveQueryExecution(query, {
              min_osquery_version: packData.min_osquery_version,
              platform: packData.platform ?? undefined,
            });

          return {
            id: queryId,
            query: query.query,
            // The pack read API types `interval` as `number | string`; normalize
            // to a number the way the pack forms do.
            interval:
              typeof query.interval === 'string' ? parseInt(query.interval, 10) : query.interval,
            ...(isEmptyOrAllPlatforms(effectivePlatform) ? {} : { platform: effectivePlatform }),
            ...(effectiveVersion ? { version: effectiveVersion } : {}),
            snapshot: query.snapshot,
            removed: query.removed,
            ecs_mapping: (query.ecs_mapping ?? {}) as NonNullable<typeof query.ecs_mapping>,
            timeout: query.timeout,
          };
        }
      );

      replace(queriesArray);
    }
  }, [packData, replace]);

  useEffect(() => {
    onError(formState.errors);
  }, [onError, formState]);

  useEffect(() => {
    register('savedQueryId');
  }, [register]);

  useEffect(() => {
    const subscription = watch((formData) => {
      onChange(
        // @ts-expect-error update types
        formData.queryType === 'pack'
          ? {
              packId: formData?.packId?.length ? formData?.packId[0] : undefined,
              queries: formData.queries,
            }
          : {
              savedQueryId: formData.savedQueryId,
              query: formData.query,
              timeout: formData.timeout,
              ecsMapping: formData.ecs_mapping,
            }
      );
    });

    return () => subscription.unsubscribe();
  }, [onChange, packData, watch]);

  const permissions = useKibana().services.application.capabilities.osquery;

  const canRunPacks = useMemo(
    () =>
      !!((permissions.runSavedQueries || permissions.writeLiveQueries) && permissions.readPacks),
    [permissions]
  );

  const canRunSingleQuery = useMemo(
    () =>
      !!(
        permissions.writeLiveQueries ||
        (permissions.runSavedQueries && permissions.readSavedQueries)
      ),
    [permissions]
  );

  const queryDetails = useMemo(
    () => ({
      queries,
      agents: [],
    }),
    [queries]
  );

  return (
    <>
      <FormProvider {...hooksForm}>
        <QueryPackSelectable canRunPacks={canRunPacks} canRunSingleQuery={canRunSingleQuery} />
        <EuiSpacer size="m" />
        {queryType === 'query' && <LiveQueryQueryField />}
        {queryType === 'pack' && (
          <PackFieldWrapper liveQueryDetails={queries && !packData ? queryDetails : undefined} />
        )}
      </FormProvider>
    </>
  );
};

const OsqueryResponseActionParamsForm = React.memo(OsqueryResponseActionParamsFormComponent);

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryResponseActionParamsForm as default };

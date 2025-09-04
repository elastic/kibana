/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiFormRow,
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiSpacer,
  EuiFieldText,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import { labels } from '../../../../../utils/i18n';
import { useIndexSearchSources } from '../../../../../hooks/tools/use_resolve_search_sources';
import type { OnechatIndexSearchToolFormData } from '../types/index_search_tool_form_types';

const DEFAULT_PAGE_SIZE = 10;

export const OnechatIndexPatternField: React.FC = () => {
  const { control, watch, setValue, setError, clearErrors, formState } =
    useFormContext<OnechatIndexSearchToolFormData>();
  const { errors } = formState;
  const pattern = watch('pattern');
  const hasQuery = (pattern?.trim().length ?? 0) > 0;
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPageIndex(0);
  }, [pattern]);

  const { data, isLoading } = useIndexSearchSources({
    pattern,
    page: pageIndex + 1,
    perPage: pageSize,
  });

  const items = useMemo(() => (hasQuery ? data?.results ?? [] : []), [data, hasQuery]);
  const total = hasQuery ? data?.total ?? 0 : 0;

  useEffect(() => {
    if (!isLoading) {
      if (pattern && total === 0) {
        setError('pattern', {
          type: 'noMatches',
          message: i18n.translate('xpack.onechat.tools.indexPattern.noMatchesError', {
            defaultMessage: 'No matches found for this pattern.',
          }),
        });
      } else if (total > 0) {
        clearErrors('pattern');
      }
    }
  }, [pattern, total, isLoading, setError, clearErrors]);

  const columns: Array<EuiBasicTableColumn<{ type: string; name: string }>> = [
    {
      field: 'type',
      name: i18n.translate('xpack.onechat.tools.indexPattern.typeCol', {
        defaultMessage: 'Target',
      }),
      width: '120px',
      render: (type: string) => {
        const human =
          type === 'index'
            ? labels.tools.indexTypeLabel
            : type === 'alias'
            ? labels.tools.aliasTypeLabel
            : labels.tools.dataStreamTypeLabel;
        return (
          <EuiBadge color="hollow" data-test-subj="onechatIndexPatternBadge">
            {human}
          </EuiBadge>
        );
      },
    },
    {
      field: 'name',
      name: i18n.translate('xpack.onechat.tools.indexPattern.nameCol', { defaultMessage: 'Name' }),
      truncateText: true,
    },
    {
      name: '',
      width: '80px',
      actions: [
        {
          name: i18n.translate('xpack.onechat.tools.indexPattern.useAction', {
            defaultMessage: 'Use',
          }),
          description: i18n.translate('xpack.onechat.tools.indexPattern.useActionDesc', {
            defaultMessage: 'Use this value as the pattern',
          }),
          icon: 'plusInCircle',
          type: 'icon',
          onClick: (item: { name: string }) =>
            setValue('pattern', item.name, { shouldDirty: true, shouldValidate: true }),
        },
      ],
    },
  ];

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.onechat.tools.newTool.indexPatternLabel', {
          defaultMessage: 'Target pattern',
        })}
        isInvalid={!!errors.pattern}
        error={errors.pattern?.message}
      >
        <Controller
          control={control}
          name="pattern"
          render={({ field: { ref, ...field }, fieldState: { invalid } }) => (
            <EuiFieldText
              {...field}
              inputRef={ref}
              isInvalid={invalid}
              data-test-subj="onechatIndexPatternInput"
            />
          )}
        />
      </EuiFormRow>

      {hasQuery && total > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            size="s"
            title={i18n.translate('xpack.onechat.tools.indexPattern.matchSuccess', {
              defaultMessage:
                'Your index pattern matches {count, plural, one {# source} other {# sources}}.',
              values: { count: total },
            })}
            color="success"
            iconType="check"
          />
        </>
      )}

      <EuiSpacer size="s" />

      <EuiBasicTable
        items={items}
        columns={columns}
        loading={hasQuery ? isLoading : false}
        rowHeader="name"
        noItemsMessage={
          hasQuery
            ? i18n.translate('xpack.onechat.tools.indexPattern.noResultsTable', {
                defaultMessage: 'No results',
              })
            : i18n.translate('xpack.onechat.tools.indexPattern.typeToSearch', {
                defaultMessage: 'Start typing to see matching sources',
              })
        }
        pagination={{
          pageIndex,
          pageSize,
          totalItemCount: total,
          pageSizeOptions: [5, 10, 25, 50],
          showPerPageOptions: true,
        }}
        onChange={({ page }) => {
          if (page) {
            setPageIndex(page.index);
            setPageSize(page.size);
          }
        }}
      />

      <EuiSpacer size="s" />
    </>
  );
};

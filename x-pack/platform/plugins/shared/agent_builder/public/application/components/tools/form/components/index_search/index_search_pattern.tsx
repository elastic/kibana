/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiSpacer,
  EuiFieldText,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useController, useFormContext } from 'react-hook-form';
import { css } from '@emotion/react';
import { EsResourceType } from '@kbn/agent-builder-common';
import { labels } from '../../../../../utils/i18n';
import { useIndexSearchSources } from '../../../../../hooks/tools/use_resolve_search_sources';
import type { IndexSearchToolFormData } from '../../types/tool_form_types';

const DEFAULT_PAGE_SIZE = 5;

export const IndexSearchPattern: React.FC = () => {
  const { control, setValue, trigger } = useFormContext<IndexSearchToolFormData>();
  const {
    field: { ref, value, onChange, onBlur, name },
    fieldState,
  } = useController({
    name: 'pattern',
    control,
  });

  const patternValue = value ?? '';
  const hasQuery = patternValue.trim().length > 0;
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPageIndex(0);
  }, [patternValue]);

  const { data, isLoading } = useIndexSearchSources({
    pattern: patternValue,
  });

  const items = useMemo(() => (hasQuery ? data?.results ?? [] : []), [data, hasQuery]);
  const total = hasQuery ? data?.total ?? 0 : 0;

  const pageOfItems = useMemo(() => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, pageIndex, pageSize]);

  const columns: Array<EuiBasicTableColumn<{ type: string; name: string }>> = [
    {
      field: 'type',
      name: i18n.translate('xpack.agentBuilder.tools.indexPattern.pattern.typeCol', {
        defaultMessage: 'Target',
      }),
      width: '120px',
      render: (type: string) => {
        return (
          <EuiBadge color="hollow" data-test-subj="agentBuilderIndexPatternBadge">
            {type === EsResourceType.index
              ? labels.tools.indexTypeLabel
              : type === EsResourceType.alias
              ? labels.tools.aliasTypeLabel
              : type === EsResourceType.dataStream
              ? labels.tools.dataStreamTypeLabel
              : undefined}
          </EuiBadge>
        );
      },
    },
    {
      field: 'name',
      name: i18n.translate('xpack.agentBuilder.tools.indexPattern.pattern.nameCol', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
    },
    {
      name: '',
      width: '80px',
      actions: [
        {
          name: i18n.translate('xpack.agentBuilder.tools.indexPattern.pattern.useAction', {
            defaultMessage: 'Use',
          }),
          description: i18n.translate(
            'xpack.agentBuilder.tools.indexPattern.pattern.useActionDesc',
            {
              defaultMessage: 'Use this value as the pattern',
            }
          ),
          icon: 'plusInCircle',
          type: 'icon',
          onClick: async (item: { name: string }) => {
            setValue('pattern', item.name, { shouldDirty: true, shouldValidate: true });
            await trigger('pattern');
          },
        },
      ],
    },
  ];

  return (
    <>
      <EuiFieldText
        name={name}
        value={patternValue}
        onChange={onChange}
        onBlur={onBlur}
        inputRef={ref}
        isInvalid={fieldState.invalid}
        aria-label={i18n.translate('xpack.agentBuilder.tools.indexPattern.pattern.inputAriaLabel', {
          defaultMessage: 'Index pattern',
        })}
        data-test-subj="agentBuilderIndexPatternInput"
      />

      {hasQuery && (
        <>
          <EuiSpacer size="m" />
          {
            <EuiCallOut
              announceOnMount
              size="s"
              title={i18n.translate('xpack.agentBuilder.tools.indexPattern.pattern.matchSuccess', {
                defaultMessage:
                  'Your index pattern matches {count, plural, one {# source} other {# sources}}.',
                values: { count: total },
              })}
              color={total === 0 ? 'warning' : 'success'}
              iconType={total === 0 ? 'warning' : 'check'}
            />
          }
        </>
      )}

      <EuiSpacer size="s" />

      <EuiBasicTable
        items={pageOfItems}
        columns={columns}
        loading={hasQuery ? isLoading : false}
        css={css`
          min-height: 300px; /* Prevent layout shift when loading */
        `}
        rowHeader="name"
        noItemsMessage={
          hasQuery
            ? i18n.translate('xpack.agentBuilder.tools.indexPattern.pattern.noResultsTable', {
                defaultMessage: 'No results',
              })
            : i18n.translate('xpack.agentBuilder.tools.indexPattern.pattern.typeToSearch', {
                defaultMessage: 'Start typing to see matching sources',
              })
        }
        pagination={{
          pageIndex,
          pageSize,
          totalItemCount: items.length,
          pageSizeOptions: [5, 10, 25, 50],
          showPerPageOptions: true,
        }}
        onChange={({ page }: { page?: { index: number; size: number } }) => {
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

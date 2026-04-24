/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import type { MultiSelectFilterOption } from '../../all_cases/multi_select_filter';
import { MultiSelectFilter } from '../../all_cases/multi_select_filter';
import {
  SO_DASHBOARD_ATTACHMENT_TYPE,
  SO_DISCOVER_SESSION_ATTACHMENT_TYPE,
  SO_LENS_ATTACHMENT_TYPE,
  SO_MAP_ATTACHMENT_TYPE,
  SO_RULE_ATTACHMENT_TYPE,
  SO_VISUALIZATION_ATTACHMENT_TYPE,
} from '../../../../common/constants/attachments';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { useRefreshCaseViewPage } from '../use_on_refresh_case_view_page';
import type { CaseAttachmentWithoutOwner } from '../../../types';
import * as i18n from './translations';

const SUPPORTED_TYPES = ['dashboard', 'visualization', 'search', 'alert', 'lens', 'map'] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

const TYPE_TO_ICON: Record<SupportedType, string> = {
  dashboard: 'dashboardApp',
  visualization: 'visualizeApp',
  search: 'discoverApp',
  alert: 'bell',
  lens: 'lensApp',
  map: 'gisApp',
};

const TYPE_TO_ATTACHMENT_TYPE: Record<SupportedType, string> = {
  dashboard: SO_DASHBOARD_ATTACHMENT_TYPE,
  visualization: SO_VISUALIZATION_ATTACHMENT_TYPE,
  search: SO_DISCOVER_SESSION_ATTACHMENT_TYPE,
  alert: SO_RULE_ATTACHMENT_TYPE,
  lens: SO_LENS_ATTACHMENT_TYPE,
  map: SO_MAP_ATTACHMENT_TYPE,
};

interface SavedObjectMetadata {
  icon?: string;
  title?: string;
  inAppUrl?: { path: string; uiCapabilitiesPath: string };
}

interface FoundSavedObject {
  id: string;
  type: string;
  meta: SavedObjectMetadata;
  updated_at?: string;
}

interface FindResponse {
  saved_objects: FoundSavedObject[];
  total: number;
  page: number;
  per_page: number;
}

const DEFAULT_PAGE_SIZE = 10;

export interface AttachSavedObjectModalProps {
  caseId: string;
  caseOwner: string;
  onClose: () => void;
}

export const AttachSavedObjectModal: React.FC<AttachSavedObjectModalProps> = ({
  caseId,
  caseOwner,
  onClose,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const {
    services: { http, application },
  } = useKibana();
  const toasts = useToasts();
  const { unifiedAttachmentTypeRegistry } = useCasesContext();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { mutateAsync: createAttachments, isLoading: isAttaching } = useCreateAttachments();

  const getDisplayName = useCallback(
    (soType: SupportedType): string => {
      const attachmentTypeId = TYPE_TO_ATTACHMENT_TYPE[soType];
      if (attachmentTypeId && unifiedAttachmentTypeRegistry.has(attachmentTypeId)) {
        return unifiedAttachmentTypeRegistry.get(attachmentTypeId).displayName;
      }
      return soType;
    },
    [unifiedAttachmentTypeRegistry]
  );

  const typeOptions = useMemo<Array<MultiSelectFilterOption<string, SupportedType>>>(
    () =>
      SUPPORTED_TYPES.map((soType) => ({
        key: soType,
        label: getDisplayName(soType),
      })),
    [getDisplayName]
  );

  const [query, setQuery] = useState<string>('');
  const [selectedTypes, setSelectedTypes] = useState<SupportedType[]>([]);
  const [page, setPage] = useState<number>(0);
  const [perPage, setPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [items, setItems] = useState<FoundSavedObject[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);

  const searchTypes = useMemo<SupportedType[]>(
    () => (selectedTypes.length === 0 ? [...SUPPORTED_TYPES] : selectedTypes),
    [selectedTypes]
  );

  const onTypesChange = useCallback(
    ({ selectedOptionKeys }: { filterId: string; selectedOptionKeys: string[] }) => {
      setSelectedTypes(selectedOptionKeys as SupportedType[]);
      setPage(0);
    },
    []
  );

  const fetchObjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await http.get<FindResponse>('/api/kibana/management/saved_objects/_find', {
        query: {
          type: searchTypes,
          search: query ? `${query}*` : undefined,
          page: page + 1,
          perPage,
          sortField: 'updated_at',
          sortOrder: 'desc',
        },
      });
      setItems(response.saved_objects);
      setTotal(response.total);
    } catch (e) {
      toasts.addError(e, { title: i18n.FETCH_ERROR_TITLE });
    } finally {
      setIsLoading(false);
    }
  }, [http, searchTypes, query, page, perPage, toasts]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  const canGoInApp = useCallback(
    (object: FoundSavedObject) => {
      const { inAppUrl } = object.meta;
      if (!inAppUrl) return false;
      if (!inAppUrl.uiCapabilitiesPath) return true;
      const segments = inAppUrl.uiCapabilitiesPath.split('.');
      let current: unknown = application.capabilities;
      for (const segment of segments) {
        if (typeof current !== 'object' || current === null) return false;
        current = (current as Record<string, unknown>)[segment];
      }
      return Boolean(current);
    },
    [application.capabilities]
  );

  const handleAttach = useCallback(
    async (object: FoundSavedObject) => {
      const supportedType = object.type as SupportedType;
      const attachmentType = TYPE_TO_ATTACHMENT_TYPE[supportedType];
      if (!attachmentType) return;

      const title = object.meta.title ?? object.id;
      const attachment = {
        type: attachmentType,
        attachmentId: object.id,
        metadata: {
          title,
          savedObjectType: supportedType,
        },
      } as unknown as CaseAttachmentWithoutOwner;

      setAttachingId(object.id);
      try {
        await createAttachments({
          caseId,
          caseOwner,
          attachments: [attachment],
        });
        toasts.addSuccess({
          title: i18n.ATTACH_SUCCESS_TITLE,
          text: title,
        });
        refreshCaseViewPage();
        onClose();
      } finally {
        setAttachingId(null);
      }
    },
    [caseId, caseOwner, createAttachments, onClose, refreshCaseViewPage, toasts]
  );

  const columns: Array<EuiBasicTableColumn<FoundSavedObject>> = useMemo(
    () => [
      {
        field: 'meta.title',
        name: i18n.COLUMN_TITLE,
        render: (_: unknown, object: FoundSavedObject) => {
          const supportedType = object.type as SupportedType;
          const title = object.meta.title || `${object.type} [id=${object.id}]`;
          const inAppPath = object.meta.inAppUrl?.path;
          const href = inAppPath ? http.basePath.prepend(inAppPath) : undefined;
          const icon = object.meta.icon || TYPE_TO_ICON[supportedType] || 'document';

          const content = (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={icon} size="m" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {href && canGoInApp(object) ? (
                  <EuiLink
                    href={href}
                    target="_blank"
                    data-test-subj={`cases-attach-so-link-${object.id}`}
                  >
                    {title}
                  </EuiLink>
                ) : (
                  <EuiText size="s">{title}</EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          );

          return content;
        },
      },
      {
        name: i18n.COLUMN_ACTIONS,
        width: '120px',
        actions: [
          {
            render: (object: FoundSavedObject) => (
              <EuiButtonEmpty
                size="s"
                iconType="paperClip"
                isLoading={attachingId === object.id}
                isDisabled={isAttaching}
                onClick={() => handleAttach(object)}
                data-test-subj={`cases-attach-so-button-${object.id}`}
              >
                {i18n.ATTACH_ACTION}
              </EuiButtonEmpty>
            ),
          },
        ],
      },
    ],
    [attachingId, canGoInApp, handleAttach, http.basePath, isAttaching]
  );

  return (
    <EuiModal
      onClose={onClose}
      maxWidth={800}
      aria-labelledby={modalTitleId}
      data-test-subj="cases-attach-so-modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              placeholder={i18n.SEARCH_PLACEHOLDER}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              isClearable
              data-test-subj="cases-attach-so-search"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup data-test-subj="cases-attach-so-type-filter-group">
              <MultiSelectFilter<string, SupportedType>
                id="attachSavedObjectType"
                buttonLabel={i18n.FILTER_TYPE_LABEL}
                onChange={onTypesChange}
                options={typeOptions}
                selectedOptionKeys={selectedTypes}
                isLoading={isLoading}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiBasicTable<FoundSavedObject>
          items={items}
          columns={columns}
          loading={isLoading}
          itemId="id"
          pagination={{
            pageIndex: page,
            pageSize: perPage,
            totalItemCount: total,
            pageSizeOptions: [10, 25, 50],
          }}
          onChange={({ page: pageInfo }: CriteriaWithPagination<FoundSavedObject>) => {
            if (pageInfo) {
              setPage(pageInfo.index);
              setPerPage(pageInfo.size);
            }
          }}
          noItemsMessage={isLoading ? i18n.LOADING : i18n.NO_ITEMS_FOUND}
          tableCaption={i18n.MODAL_TITLE}
          data-test-subj="cases-attach-so-table"
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="cases-attach-so-close">
          {i18n.CLOSE}
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
};

AttachSavedObjectModal.displayName = 'AttachSavedObjectModal';

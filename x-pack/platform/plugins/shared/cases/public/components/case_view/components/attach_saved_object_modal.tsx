/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import {
  dashboardStateToAttachmentData,
  type DashboardAttachmentData as DashboardAttachmentApiData,
} from '@kbn/dashboard-agent-common';
import { FormattedRelativePreferenceDate } from '../../formatted_date';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DISCOVER_SESSION_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  MAP_ATTACHMENT_TYPE,
} from '../../../../common/constants/attachments';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { useRefreshCaseViewPage } from '../use_on_refresh_case_view_page';
import type { CaseAttachmentWithoutOwner } from '../../../types';
import * as i18n from './translations';

// `visualization` (legacy SO) is intentionally excluded — it has no dedicated
// public renderer (only via the embeddable framework with the visualize
// registry), so wiring it would mean owning the legacy viz shape with little
// payoff. Re-add as a quick reference attachment when the requirement comes up.
const SUPPORTED_TYPES = ['dashboard', 'search', 'lens', 'map'] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

const TYPE_TO_ICON: Record<SupportedType, string> = {
  dashboard: 'dashboardApp',
  search: 'discoverApp',
  lens: 'lensApp',
  map: 'gisApp',
};

const TYPE_TO_ATTACHMENT_TYPE: Record<SupportedType, string> = {
  dashboard: DASHBOARD_ATTACHMENT_TYPE,
  lens: LENS_ATTACHMENT_TYPE,
  search: DISCOVER_SESSION_ATTACHMENT_TYPE,
  map: MAP_ATTACHMENT_TYPE,
};

/** SO types that emit a value-typed payload with an inline snapshot. */
const VALUE_TYPED: ReadonlySet<SupportedType> = new Set(['dashboard', 'map']);

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
    services: {
      http,
      application,
      contentManagement,
      dashboard,
      data: {
        query: {
          timefilter: { timefilter },
        },
      },
    },
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

  const typeOptions = useMemo<Array<{ value: SupportedType | 'all'; text: string }>>(
    () => [
      { value: 'all', text: i18n.FILTER_ALL },
      ...SUPPORTED_TYPES.map((soType) => ({
        value: soType,
        text: getDisplayName(soType),
      })),
    ],
    [getDisplayName]
  );

  const [query, setQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<SupportedType | 'all'>('all');
  const [page, setPage] = useState<number>(0);
  const [perPage, setPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [items, setItems] = useState<FoundSavedObject[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);

  const searchTypes = useMemo<SupportedType[]>(
    () => (selectedType === 'all' ? [...SUPPORTED_TYPES] : [selectedType]),
    [selectedType]
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

  /**
   * Fetch a Lens SO and return a `LensSavedObjectAttributes`-shaped snapshot
   * with the SO's top-level `references` inlined. The lens embeddable reads
   * data view refs from `attributes.references`, so without this merge the
   * fallback render is blank. Returns `undefined` on any failure; the SO-ref
   * attachment then degrades to a live-fetch-only render or, if that also
   * fails, a title-only event.
   */
  const fetchLensSnapshot = useCallback(
    async (id: string): Promise<Record<string, unknown> | undefined> => {
      try {
        const result = (await contentManagement.client.get({
          contentTypeId: 'lens',
          id,
        })) as
          | {
              item?: {
                attributes?: LensAttributes;
                references?: Array<{ type: string; id: string; name: string }>;
              };
            }
          | undefined;
        const attributes = result?.item?.attributes;
        if (!attributes) return undefined;
        const references = result?.item?.references ?? [];
        return { ...(attributes as unknown as Record<string, unknown>), references };
      } catch {
        return undefined;
      }
    },
    [contentManagement]
  );

  /**
   * Fetch a Dashboard SO and convert its `DashboardState` to the
   * `DashboardAttachmentData` API shape (panels, sections, controls, …) so the
   * renderer can embed the dashboard inline. Returns `undefined` on failure.
   */
  const fetchDashboardConfig = useCallback(
    async (id: string): Promise<DashboardAttachmentApiData | undefined> => {
      try {
        const findService = await dashboard.findDashboardsService();
        const result = await findService.findById(id);
        if (result.status !== 'success') return undefined;
        return dashboardStateToAttachmentData(result.attributes);
      } catch {
        return undefined;
      }
    },
    [dashboard]
  );

  /**
   * Fetch a Map SO and snapshot its `attributes` verbatim. The CM client returns
   * the parsed REST shape (`layers`, `center`, `settings`, …), which the
   * renderer feeds directly to `services.maps.Map`. Returns `undefined` on any
   * failure; the attachment then degrades to a title-only event.
   */
  const fetchMapAttributes = useCallback(
    async (id: string): Promise<Record<string, unknown> | undefined> => {
      try {
        const result = (await contentManagement.client.get({
          contentTypeId: 'map',
          id,
        })) as { item?: { attributes?: Record<string, unknown> } } | undefined;
        return result?.item?.attributes ?? undefined;
      } catch {
        return undefined;
      }
    },
    [contentManagement]
  );

  const handleAttach = useCallback(
    async (object: FoundSavedObject) => {
      const supportedType = object.type as SupportedType;
      const attachmentType = TYPE_TO_ATTACHMENT_TYPE[supportedType];
      if (!attachmentType) return;

      const title = object.meta.title ?? object.id;
      setAttachingId(object.id);
      try {
        // Dashboard and Map are value-typed: snapshot the SO content at
        // attach time so the renderer can embed the actual viz. Lens is
        // reference-typed (Model C: live-fetch + snapshot fallback) — the
        // snapshot lives under `metadata.config` and is only consulted if the
        // live SO fetch fails. Other SO attachments are reference-typed too.
        let attachment: CaseAttachmentWithoutOwner;
        if (supportedType === 'lens') {
          const snapshot = await fetchLensSnapshot(object.id);
          // Mirror the persistable-lens convention: capture the user's current
          // timepicker selection so the embeddable has a time context (date
          // histograms with `interval: 'auto'` otherwise blow up with
          // "Invalid interval specified"). Falls back to a sensible default.
          const lensTime = timefilter.getTime();
          const timeRange =
            lensTime?.from && lensTime?.to
              ? { from: lensTime.from, to: lensTime.to }
              : { from: 'now-15m', to: 'now' };
          attachment = {
            type: attachmentType,
            attachmentId: object.id,
            metadata: {
              title,
              soType: 'lens',
              timeRange,
              ...(snapshot ? { config: snapshot } : {}),
            },
          } as unknown as CaseAttachmentWithoutOwner;
        } else if (VALUE_TYPED.has(supportedType)) {
          if (supportedType === 'map') {
            const attributes = await fetchMapAttributes(object.id);
            attachment = {
              type: attachmentType,
              data: {
                savedObjectId: object.id,
                title,
                ...(attributes ? { attributes } : {}),
              },
            } as unknown as CaseAttachmentWithoutOwner;
          } else {
            const config = await fetchDashboardConfig(object.id);
            attachment = {
              type: attachmentType,
              data: {
                savedObjectId: object.id,
                title,
                ...(config ? { config } : {}),
              },
            } as unknown as CaseAttachmentWithoutOwner;
          }
        } else {
          attachment = {
            type: attachmentType,
            attachmentId: object.id,
            metadata: {
              title,
              soType: supportedType,
            },
          } as unknown as CaseAttachmentWithoutOwner;
        }

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
    [
      caseId,
      caseOwner,
      createAttachments,
      fetchDashboardConfig,
      fetchLensSnapshot,
      fetchMapAttributes,
      onClose,
      refreshCaseViewPage,
      timefilter,
      toasts,
    ]
  );

  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const renderItemCard = useCallback(
    (object: FoundSavedObject) => {
      const supportedType = object.type as SupportedType;
      const title = object.meta.title || `${object.type} [id=${object.id}]`;
      const inAppPath = object.meta.inAppUrl?.path;
      const href = inAppPath ? http.basePath.prepend(inAppPath) : undefined;
      const icon = object.meta.icon || TYPE_TO_ICON[supportedType] || 'document';
      const typeLabel = getDisplayName(supportedType);

      return (
        <EuiPanel
          key={object.id}
          hasBorder
          hasShadow={false}
          paddingSize="m"
          data-test-subj={`cases-attach-so-card-${object.id}`}
        >
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            gutterSize="m"
            responsive={false}
          >
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
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
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow" data-test-subj="cases-attach-so-card-type">
                        {typeLabel}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {object.updated_at && (
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="xs"
                      color="subdued"
                      data-test-subj="cases-attach-so-card-updated"
                    >
                      {`${i18n.UPDATED_AT_PREFIX} `}
                      <FormattedRelativePreferenceDate value={object.updated_at} />
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    },
    [attachingId, canGoInApp, getDisplayName, handleAttach, http.basePath, isAttaching]
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
            <EuiSelect
              options={typeOptions}
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as SupportedType | 'all');
                setPage(0);
              }}
              data-test-subj="cases-attach-so-type-select"
              aria-label={i18n.FILTER_TYPE_LABEL}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {isLoading ? (
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            data-test-subj="cases-attach-so-loading"
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : items.length === 0 ? (
          <EuiEmptyPrompt
            iconType="search"
            titleSize="xs"
            body={<p>{i18n.NO_ITEMS_FOUND}</p>}
            data-test-subj="cases-attach-so-empty"
          />
        ) : (
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            aria-label={i18n.SAVED_OBJECT_LIST_LABEL}
            data-test-subj="cases-attach-so-list"
          >
            {items.map((object) => (
              <EuiFlexItem key={object.id} grow={false}>
                {renderItemCard(object)}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
        {!isLoading && items.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTablePagination
              activePage={page}
              pageCount={pageCount}
              itemsPerPage={perPage}
              itemsPerPageOptions={[10, 25, 50]}
              onChangePage={(nextPage) => setPage(nextPage)}
              onChangeItemsPerPage={(nextPerPage) => {
                setPerPage(nextPerPage);
                setPage(0);
              }}
              data-test-subj="cases-attach-so-pagination"
            />
          </>
        )}
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

import React from 'react';
import { type DashboardAttachmentData as DashboardAttachmentApiData } from '@kbn/agent-builder-dashboards-common';
import type { DashboardAttachmentData, DashboardAttachmentMetadata, DashboardConfig } from '../../../../common/types/domain_zod/attachment/dashboard/v2';
import type { UnifiedReferenceAttachmentViewProps } from '../../../client/attachment_framework/types';
type DashboardViewProps = UnifiedReferenceAttachmentViewProps<DashboardAttachmentMetadata, string, DashboardAttachmentData>;
/**
 * Compile-time tripwire: if the upstream `DashboardAttachmentApiData` shape
 * drops or renames any of the fields our local `DashboardConfigSchema`
 * declares, this `Pick` assignment fails typecheck and forces us to sync the
 * inline schema in `common/types/domain_zod/attachment/dashboard/v2.ts`. The
 * local schema is intentionally loose (most fields typed as `unknown`) so
 * shape evolution within an existing field is allowed; only field
 * presence/renames trigger the tripwire.
 */
type DashboardConfigKey = 'title' | 'description' | 'panels' | 'query' | 'time_range' | 'refresh_interval' | 'filters' | 'options' | 'tags' | 'pinned_panels' | 'access_control' | 'project_routing';
export type DashboardConfigMatchesAttachmentData = (config: Pick<DashboardAttachmentApiData, DashboardConfigKey>) => Pick<DashboardConfig, DashboardConfigKey>;
export declare const DashboardEmbedAttachment: React.NamedExoticComponent<DashboardViewProps>;
export {};

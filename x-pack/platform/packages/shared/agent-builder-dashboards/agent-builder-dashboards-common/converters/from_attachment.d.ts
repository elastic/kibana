import type { DashboardState } from '@kbn/dashboard-plugin/server';
import type { DashboardAttachmentData } from '../types';
/**
 * Converts a DashboardAttachment to a DashboardState.
 * Uses provided values from the attachment, falling back to defaults for missing fields.
 */
export declare const attachmentDataToDashboardState: ({ panels, filters, query, pinned_panels, access_control, options, ...rest }: DashboardAttachmentData) => DashboardState;

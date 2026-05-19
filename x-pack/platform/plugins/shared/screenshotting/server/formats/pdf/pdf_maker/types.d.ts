import type { Ensure, SerializableRecord } from '@kbn/utility-types';
export type TemplateLayout = Ensure<{
    orientation: 'landscape' | 'portrait' | undefined;
    useReportingBranding: boolean;
    hasHeader: boolean;
    hasFooter: boolean;
    pageSize: string | {
        width: number;
        height: number | 'auto';
    };
}, SerializableRecord>;

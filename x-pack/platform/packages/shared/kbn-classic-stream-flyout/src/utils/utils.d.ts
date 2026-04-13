import { type TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';
export declare const formatDataRetention: (template: IndexTemplate) => string | undefined;
export declare const indexModeLabels: {
    standard: string;
    logsdb: string;
    time_series: string;
    lookup: string;
};

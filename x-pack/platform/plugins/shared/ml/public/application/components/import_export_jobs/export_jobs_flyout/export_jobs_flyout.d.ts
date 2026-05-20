import type { FC } from 'react';
import type { ExportJobsFlyoutContentProps } from './export_jobs_flyout_content';
export interface Props extends Pick<ExportJobsFlyoutContentProps, 'currentTab'> {
    isDisabled: boolean;
}
export declare const ExportJobsFlyout: FC<Props>;

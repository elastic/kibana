import type { FC, MouseEventHandler } from 'react';
import type { MlJobGroupWithTimeRange } from '../job_selector_flyout';
export interface NewSelectionIdBadgesProps {
    limit: number;
    newSelection: string[];
    onDeleteClick?: Function;
    onLinkClick?: MouseEventHandler<HTMLAnchorElement>;
    showAllBadges?: boolean;
    groups: MlJobGroupWithTimeRange[];
}
export declare const NewSelectionIdBadges: FC<NewSelectionIdBadgesProps>;

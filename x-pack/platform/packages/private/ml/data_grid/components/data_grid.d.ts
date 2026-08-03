import type { FC } from 'react';
import type { EuiDataGridCellPopoverElementProps, EuiDataGridProps } from '@elastic/eui';
import type { CoreSetup } from '@kbn/core/public';
import type { UseIndexDataReturnType } from '../lib/types';
export declare const DataGridTitle: FC<{
    title: string;
}>;
interface PropsWithoutHeader extends UseIndexDataReturnType {
    dataTestSubj: string;
    renderCellPopover?: (popoverProps: EuiDataGridCellPopoverElementProps) => JSX.Element;
    toastNotifications: CoreSetup['notifications']['toasts'];
    trailingControlColumns?: EuiDataGridProps['trailingControlColumns'];
}
interface PropsWithHeader extends PropsWithoutHeader {
    copyToClipboard: string;
    copyToClipboardDescription: string;
    title: string;
}
type Props = PropsWithHeader | PropsWithoutHeader;
/**
 * Custom data grid component with support for mini histograms.
 */
export declare const DataGrid: FC<Props>;
export {};

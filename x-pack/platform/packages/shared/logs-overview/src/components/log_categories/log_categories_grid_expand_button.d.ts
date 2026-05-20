import type { RenderCellValue } from '@elastic/eui';
import type { LogCategory } from '../../types';
interface CreateLogCategoriesGridExpandButtonProps {
    expandedRowIndex: number | null;
    onOpenFlyout: (category: LogCategory, rowIndex: number) => void;
    onCloseFlyout: () => void;
}
export declare const createLogCategoriesGridExpandButton: ({ expandedRowIndex, onOpenFlyout, onCloseFlyout, }: CreateLogCategoriesGridExpandButtonProps) => RenderCellValue;
export {};

import type { Output } from '../../../../types';
import type { useConfirmModal } from '../../hooks/use_confirm_modal';
export declare function confirmUpdate(output: Output, confirm: ReturnType<typeof useConfirmModal>['confirm']): Promise<boolean>;

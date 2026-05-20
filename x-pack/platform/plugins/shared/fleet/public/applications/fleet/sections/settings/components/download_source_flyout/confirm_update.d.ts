import type { DownloadSource } from '../../../../types';
import type { useConfirmModal } from '../../hooks/use_confirm_modal';
export declare function confirmUpdate(downloadSource: DownloadSource, confirm: ReturnType<typeof useConfirmModal>['confirm']): Promise<boolean>;

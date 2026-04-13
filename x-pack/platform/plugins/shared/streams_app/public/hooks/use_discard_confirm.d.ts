import type { OverlayModalConfirmOptions } from '@kbn/core/public';
export interface DiscardPromptOptions extends OverlayModalConfirmOptions {
    message: string;
}
export declare const useDiscardConfirm: <THandler extends (..._args: any[]) => any>(handler: THandler, options?: OverlayModalConfirmOptions & {
    message?: string;
    enabled?: boolean;
}) => THandler | ((...args: Parameters<THandler>) => Promise<void>);

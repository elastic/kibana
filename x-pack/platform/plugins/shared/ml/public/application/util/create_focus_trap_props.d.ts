import type { EuiFlyoutProps } from '@elastic/eui';
export type FocusTrapProps = EuiFlyoutProps['focusTrapProps'];
/**
 * Creates focusTrapProps for EuiFlyout components to restore focus to a trigger element.
 * Useful when opening a flyout from a context menu.
 */
export declare const createFocusTrapProps: (triggerElement: HTMLElement | null | undefined) => FocusTrapProps;
export declare const createJobActionFocusTrapProps: (jobId: string) => Pick<import("@elastic/eui").EuiFocusTrapProps, "returnFocus" | "shards" | "closeOnMouseup"> | undefined;

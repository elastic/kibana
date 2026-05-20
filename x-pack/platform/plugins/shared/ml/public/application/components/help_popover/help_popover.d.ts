import type { FC, PropsWithChildren } from 'react';
import type { EuiLinkButtonProps, EuiPopoverProps } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
export declare const HelpPopoverButton: FC<{
    onClick: EuiLinkButtonProps['onClick'];
    styles?: SerializedStyles;
}>;
interface HelpPopoverProps {
    anchorPosition?: EuiPopoverProps['anchorPosition'];
    title?: string;
    buttonCss?: SerializedStyles;
}
export declare const HelpPopover: FC<PropsWithChildren<HelpPopoverProps>>;
export {};

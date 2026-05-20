import type { EuiButtonEmptyProps } from '@elastic/eui';
import React from 'react';
type OpenInLogsExplorerButtonProps = Pick<EuiButtonEmptyProps, 'href' | 'flush' | 'size'> & {
    testSubject: string;
};
declare const OpenInLogsExplorerButton: ({ testSubject, ...rest }: OpenInLogsExplorerButtonProps) => React.JSX.Element;
export default OpenInLogsExplorerButton;

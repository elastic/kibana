import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
export declare function LoadingPanel({ loading, size, className, }: {
    loading?: boolean;
    size?: React.ComponentProps<typeof EuiLoadingSpinner>['size'];
    className?: string;
}): React.JSX.Element | null;

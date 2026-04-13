import type { ReactNode } from 'react';
import React from 'react';
export declare function FieldsList({ fields, dataTestSubj, }: {
    fields: Array<{
        fieldTitle: string;
        fieldValue: ReactNode;
        isLoading: boolean;
        actionsMenu?: ReactNode;
    }>;
    dataTestSubj?: string;
}): React.JSX.Element;

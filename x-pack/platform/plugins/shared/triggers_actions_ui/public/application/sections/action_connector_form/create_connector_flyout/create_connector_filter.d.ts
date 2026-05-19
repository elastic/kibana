import React from 'react';
export interface CreateConnectorFilterProps {
    searchValue: string;
    onSearchValueChange: (value: string) => void;
}
export declare const CreateConnectorFilter: React.FC<CreateConnectorFilterProps>;

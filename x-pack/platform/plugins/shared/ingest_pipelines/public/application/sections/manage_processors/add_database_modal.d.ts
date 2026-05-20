import React from 'react';
import type { GeoipDatabase } from '../../../../common/types';
export declare const AddDatabaseModal: ({ closeModal, reloadDatabases, databases, }: {
    closeModal: () => void;
    reloadDatabases: () => void;
    databases: GeoipDatabase[];
}) => React.JSX.Element;

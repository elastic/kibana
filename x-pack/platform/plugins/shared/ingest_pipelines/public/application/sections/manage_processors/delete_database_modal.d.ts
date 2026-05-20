import React from 'react';
import type { GeoipDatabase } from '../../../../common/types';
export declare const DeleteDatabaseModal: ({ closeModal, database, reloadDatabases, }: {
    closeModal: () => void;
    database: GeoipDatabase;
    reloadDatabases: () => void;
}) => React.JSX.Element;

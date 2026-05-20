import type { GeoipDatabase, DatabaseNameOption } from '../../../../common/types';
export declare const ADD_DATABASE_MODAL_TITLE_ID = "manageProcessorsAddGeoipDatabase";
export declare const ADD_DATABASE_MODAL_FORM_ID = "manageProcessorsAddGeoipDatabaseForm";
export declare const DATABASE_TYPE_OPTIONS: {
    value: string;
    text: string;
}[];
export declare const GEOIP_NAME_OPTIONS: DatabaseNameOption[];
export declare const IPINFO_NAME_OPTIONS: DatabaseNameOption[];
export declare const getAddDatabaseSuccessMessage: (databaseName: string) => string;
export declare const addDatabaseErrorTitle: string;
export declare const DELETE_DATABASE_MODAL_TITLE_ID = "manageProcessorsDeleteGeoipDatabase";
export declare const DELETE_DATABASE_MODAL_FORM_ID = "manageProcessorsDeleteGeoipDatabaseForm";
export declare const getDeleteDatabaseSuccessMessage: (databaseName: string) => string;
export declare const deleteDatabaseErrorTitle: string;
export declare const getTypeLabel: (type: GeoipDatabase["type"]) => string;

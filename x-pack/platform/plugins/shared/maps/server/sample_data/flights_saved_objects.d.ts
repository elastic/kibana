export function getFlightsSavedObjects(): {
    id: string;
    type: string;
    updated_at: string;
    version: string;
    attributes: {
        title: string;
        description: string;
        layerListJSON: string;
        mapStateJSON: string;
        uiStateJSON: string;
    };
    migrationVersion: {
        map: string;
    };
    references: {
        id: string;
        name: string;
        type: string;
    }[];
}[];

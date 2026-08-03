export function getEcommerceSavedObjects(): {
    id: string;
    type: string;
    updated_at: string;
    version: string;
    references: {
        name: string;
        type: string;
        id: string;
    }[];
    migrationVersion: {
        map: string;
    };
    attributes: {
        title: string;
        description: string;
        mapStateJSON: string;
        layerListJSON: string;
        uiStateJSON: string;
        bounds: {
            type: string;
            coordinates: number[][];
        };
    };
}[];

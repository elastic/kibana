export declare function getSpacesFilter(spaceId?: string): {
    terms: {
        "kibana.space_ids": string[];
    };
} | undefined;

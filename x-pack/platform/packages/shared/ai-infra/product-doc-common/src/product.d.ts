export declare enum DocumentationProduct {
    kibana = "kibana",
    elasticsearch = "elasticsearch",
    observability = "observability",
    security = "security"
}
export type ProductName = keyof typeof DocumentationProduct;

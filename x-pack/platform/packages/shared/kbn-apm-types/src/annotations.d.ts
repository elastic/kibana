export declare enum AnnotationType {
    VERSION = "version"
}
export interface Annotation {
    type: AnnotationType;
    id: string;
    '@timestamp': number;
    text: string;
}

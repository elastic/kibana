import type { ProductName } from './product';
interface SemanticTextField {
    text: string;
}
interface SemanticTextArrayField {
    text: string[];
}
export interface ProductDocumentationAttributes {
    content_title: string;
    content_body: string | SemanticTextField;
    product_name: ProductName;
    root_type: string;
    slug: string;
    url: string;
    version: string;
    ai_subtitle: string;
    ai_summary: string | SemanticTextField;
    ai_questions_answered: string[] | SemanticTextArrayField;
    ai_tags: string[];
}
export {};

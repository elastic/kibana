import type { NerInference } from './ner';
import type { TextExpansionInference } from './text_expansion';
import type { QuestionAnsweringInference } from './question_answering';
import type { TextClassificationInference, ZeroShotClassificationInference, FillMaskInference, LangIdentInference } from './text_classification';
import type { TextEmbeddingInference } from './text_embedding';
export type InferrerType = NerInference | QuestionAnsweringInference | TextClassificationInference | TextEmbeddingInference | ZeroShotClassificationInference | FillMaskInference | LangIdentInference | TextExpansionInference;

import type { RenameFieldsAndRemoveAction } from '../utils';
import type { GrokProcessor, DissectProcessor, DateProcessor, RenameProcessor, SetProcessor, ManualIngestPipelineProcessor, MathProcessor, AppendProcessor, ConvertProcessor, RemoveByPrefixProcessor, RemoveProcessor, DropDocumentProcessor, ReplaceProcessor, RedactProcessor, UppercaseProcessor, TrimProcessor, LowercaseProcessor, JoinProcessor, SplitProcessor, SortProcessor, ConcatProcessor, NetworkDirectionProcessor, JsonExtractProcessor, EnrichProcessor, RegisteredDomainProcessor } from '.';
import type { Condition } from '../conditions';
/** Ingest Pipeline processor configurations very closely resemble Streamlang DSL action blocks */
export type IngestPipelineGrokProcessor = RenameFieldsAndRemoveAction<GrokProcessor, {
    from: 'field';
    where: 'if';
}>;
export type IngestPipelineDissectProcessor = RenameFieldsAndRemoveAction<DissectProcessor, {
    from: 'field';
    where: 'if';
}>;
export type IngestPipelineDateProcessor = RenameFieldsAndRemoveAction<DateProcessor, {
    from: 'field';
    to: 'target_field';
    where: 'if';
}>;
export type IngestPipelineRenameProcessor = RenameFieldsAndRemoveAction<RenameProcessor, {
    from: 'field';
    to: 'target_field';
    where: 'if';
}>;
export type IngestPipelineSetProcessor = RenameFieldsAndRemoveAction<SetProcessor, {
    to: 'field';
    where: 'if';
}>;
export type IngestPipelineAppendProcessor = RenameFieldsAndRemoveAction<AppendProcessor, {
    to: 'field';
    where: 'if';
}>;
export type IngestPipelineConvertProcessor = RenameFieldsAndRemoveAction<ConvertProcessor, ConvertProcessor extends {
    where: Condition;
} ? {
    from: 'field';
    to: 'target_field';
    where: 'if';
} : {
    from: 'field';
    to: 'target_field';
}>;
export type IngestPipelineRemoveByPrefixProcessor = RenameFieldsAndRemoveAction<RemoveByPrefixProcessor, {
    from: 'fields';
}>;
export type IngestPipelineRemoveProcessor = RenameFieldsAndRemoveAction<RemoveProcessor, {
    from: 'field';
    where: 'if';
}>;
export type IngestPipelineDropProcessor = RenameFieldsAndRemoveAction<DropDocumentProcessor, {
    where: 'if';
}>;
export type IngestPipelineReplaceProcessor = RenameFieldsAndRemoveAction<ReplaceProcessor, {
    from: 'field';
    to: 'target_field';
    where: 'if';
}>;
export type IngestPipelineRedactProcessor = RenameFieldsAndRemoveAction<RedactProcessor, {
    from: 'field';
    where: 'if';
}>;
export type IngestPipelineMathProcessor = RenameFieldsAndRemoveAction<MathProcessor, {
    where: 'if';
}>;
export type IngestPipelineUppercaseProcessor = RenameFieldsAndRemoveAction<UppercaseProcessor, {
    from: 'field';
    to: 'target_field';
    where: 'if';
}>;
export type IngestPipelineLowercaseProcessor = RenameFieldsAndRemoveAction<LowercaseProcessor, {
    from: 'field';
    to: 'target_field';
    where: 'if';
}>;
export type IngestPipelineTrimProcessor = RenameFieldsAndRemoveAction<TrimProcessor, {
    from: 'field';
    to: 'target_field';
    where: 'if';
}>;
export type IngestPipelineJoinProcessor = RenameFieldsAndRemoveAction<JoinProcessor, {
    to: 'field';
    where: 'if';
}>;
export type IngestPipelineConcatProcessor = RenameFieldsAndRemoveAction<ConcatProcessor, {
    to: 'field';
    where: 'if';
}>;
export type IngestPipelineSplitProcessor = RenameFieldsAndRemoveAction<SplitProcessor, {
    from: 'field';
    to: 'target_field';
    where: 'if';
}>;
export type IngestPipelineSortProcessor = RenameFieldsAndRemoveAction<SortProcessor, {
    from: 'field';
    to: 'target_field';
    where: 'if';
}>;
export type IngestPipelineNetworkDirectionProcessor = RenameFieldsAndRemoveAction<NetworkDirectionProcessor, {
    where: 'if';
}>;
export type IngestPipelineJsonExtractProcessor = RenameFieldsAndRemoveAction<JsonExtractProcessor, {
    where: 'if';
}>;
export type IngestPipelineEnrichProcessor = RenameFieldsAndRemoveAction<EnrichProcessor, {
    to: 'target_field';
    where: 'if';
}>;
export type IngestPipelineRegisteredDomainProcessor = RenameFieldsAndRemoveAction<RegisteredDomainProcessor, {
    where: 'if';
}>;
export type IngestPipelineManualIngestPipelineProcessor = RenameFieldsAndRemoveAction<ManualIngestPipelineProcessor, {
    where: 'if';
}>;
export type IngestPipelineProcessor = IngestPipelineGrokProcessor | IngestPipelineDissectProcessor | IngestPipelineDateProcessor | IngestPipelineDropProcessor | IngestPipelineMathProcessor | IngestPipelineRenameProcessor | IngestPipelineSetProcessor | IngestPipelineAppendProcessor | IngestPipelineConvertProcessor | IngestPipelineRemoveByPrefixProcessor | IngestPipelineRemoveProcessor | IngestPipelineReplaceProcessor | IngestPipelineRedactProcessor | IngestPipelineUppercaseProcessor | IngestPipelineLowercaseProcessor | IngestPipelineTrimProcessor | IngestPipelineJoinProcessor | IngestPipelineSplitProcessor | IngestPipelineSortProcessor | IngestPipelineConcatProcessor | IngestPipelineNetworkDirectionProcessor | IngestPipelineJsonExtractProcessor | IngestPipelineEnrichProcessor | IngestPipelineRegisteredDomainProcessor | IngestPipelineManualIngestPipelineProcessor;

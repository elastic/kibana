import { monaco } from '@kbn/monaco';
/**
 * Adds `$ref` autocomplete to the template YAML editor, sourced from the owner's field library.
 * The editor otherwise has no completion for library references — authors must remember exact field
 * names or open the docs — so typing `$ref:` now offers the available field definitions inline.
 *
 * A single completion provider is registered for the `yaml` language and disposed on unmount. It is
 * scoped to this editor's model (URI guard) so it never contributes suggestions to other YAML
 * editors on the page. The provider reads the field list from a ref that a separate effect keeps
 * in sync with the query, so provider registration does not churn as data loads.
 */
export declare const useRefFieldCompletion: (editor: monaco.editor.IStandaloneCodeEditor | null, owner: string | undefined) => void;

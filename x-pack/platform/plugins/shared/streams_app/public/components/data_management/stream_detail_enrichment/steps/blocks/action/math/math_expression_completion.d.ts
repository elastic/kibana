import { monaco } from '@kbn/monaco';
import type { Suggestion } from '../../../../../shared/autocomplete_selector';
/**
 * Registers the completion provider for the math expression language.
 * Field suggestions are captured in a closure, so re-register when they change.
 * Returns a disposable that should be called on component unmount or before re-registering.
 */
export declare function registerMathCompletionProvider(fieldSuggestions?: Suggestion[]): monaco.IDisposable;
/**
 * Registers the signature help provider for showing function parameter hints.
 * Returns a disposable that should be called on component unmount.
 */
export declare function registerMathSignatureHelpProvider(): monaco.IDisposable;

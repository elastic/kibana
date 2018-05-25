/**
 * The interface that the adapters used to open spy panels have to fullfill.
 */
export interface Adapters {
  [key: string]: any;
}

/**
 * The props interface that a custom inspector view component, that will be passed
 * to {@link InspectorViewDescription#component}, must use.
 */
export interface InspectorViewProps {
  /**
   * The adapters thta has been used to open the inspector.
   */
  adapters: Adapters;
  /**
   * The title that the inspector is currently using e.g. a visualization name.
   */
  title: string;
}

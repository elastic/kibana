/**
 * EUI's SuperDatePicker quick menu uses `anchorPosition="downLeft"`, so the popover grows to the
 * right and can cover the "Create classic stream" control in the All streams header. Date popover
 * buttons for the start value also anchor `downLeft`. We cannot change EUI from here, so when a
 * popover is opened from the ingest demo toolbar we shift its panel left so its right edge stays
 * within the header actions cluster (after EUI finishes positioning).
 */
export declare function useStreamsListHeaderDatePopoversRightCap(enabled: boolean): void;

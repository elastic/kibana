import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
export type SnoozeExpiryModalResult = string | null;
export declare const openSnoozeExpiryModal: (overlays: OverlayStart, rendering: CoreStart["rendering"]) => Promise<SnoozeExpiryModalResult | undefined>;

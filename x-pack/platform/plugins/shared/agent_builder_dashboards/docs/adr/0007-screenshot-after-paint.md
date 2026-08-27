# Attach the Prettify image only after the dashboard has painted

The button must wait until the visible dashboard has actually rendered (panels and controls; unwind collapsed sections as needed) before attaching the image and auto-sending. A blank or half-painted PNG produced false findings (invented broken ES|QL) in the PoC.

Do not open chat on a placeholder image and replace it later — Dashboard Review may run on the placeholder.

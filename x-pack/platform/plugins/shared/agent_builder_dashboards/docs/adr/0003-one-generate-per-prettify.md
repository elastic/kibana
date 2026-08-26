# One Generate per Prettify request

A Prettify session may run Generate once. The outer agent inspects the painted screenshot, splits findings into Hard rule vs Creative, and writes `operations[]` in that one call. There is no dedicated Prettify tool and no inspect-then-Generate outer loop.

If composition looks thin, prefer modify and expand over deleting visualization panels. Never review the original image after mutating — it is a stale picture.

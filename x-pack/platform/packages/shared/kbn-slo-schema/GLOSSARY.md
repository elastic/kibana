# SLO

Service level objectives: the definitions users author, the instances they expand into, and the composites built on top of them.

## Language

**SLO**:
A target for the ratio of good events to total events of one indicator, measured over a time window.
_Avoid_: objective (alone), SLO definition (when the instance is meant)

**SLO instance**:
One concrete series of an SLO, produced per distinct value of its group-by fields; an ungrouped SLO has a single instance.
_Avoid_: SLO group, grouping

**Composite SLO**:
An SLO whose SLI is the weighted average of the SLIs of its members. Its ID follows the same format as an SLO ID, but Composite SLO IDs and SLO IDs are separate: the same value may name one of each.
_Avoid_: aggregate SLO, SLO group

**Member**:
An SLO, or one SLO instance, that contributes to a Composite SLO with a weight. A member is never itself a Composite SLO.
_Avoid_: child SLO, component

# Dreaming eval: dreaming-eval-workarena, run wa-dev-1

Whether the 224 KIs hold each target, judged by `.anthropic-claude-4.6-sonnet-chat_completion` on the KIs ranked highest by the .rerank-v1-elasticsearch reranker. Covered counts 1 and partial 0.5.

## Overall

| | Targets | Covered | Partial | Missing | Error | Score |
| --- | --- | --- | --- | --- | --- | --- |
| all | 10 | 2 | 4 | 4 | 0 | 40.0% |

## By dataset

| | Targets | Covered | Partial | Missing | Error | Score |
| --- | --- | --- | --- | --- | --- | --- |
| longmemeval_v2_enterprise | 10 | 2 | 4 | 4 | 0 | 40.0% |

## By category

| | Targets | Covered | Partial | Missing | Error | Score |
| --- | --- | --- | --- | --- | --- | --- |
| dynamic-environment | 3 | 0 | 1 | 2 | 0 | 16.7% |
| procedure | 3 | 2 | 1 | 0 | 0 | 83.3% |
| static-environment | 4 | 0 | 2 | 2 | 0 | 25.0% |

## Not covered

- **partial** `c0593d69` (static-environment): I am working with a few forms in our ServiceNow portal. Create Change Request vs Problem vs Incident vs Hardware vs User. Among create-request, problem, inciden → four. The stored items confirm subtabs for Incident (Notes, Related Records, Resolution Information), Hardware (General, Financial, Contracts, Disposal), and Change Request (Planning, Closure Information, Schedule), but there is no stored information about whether the Problem or User forms have subtabs, making it impossible to confirm the total count of four without that missing data.
- **partial** `a7edfb7a` (static-environment): I am working with a few forms in our ServiceNow portal. Create Change Request vs Problem vs Incident. What is the subtab name shared by all the three forms? → Notes. The stored items confirm that the Incident form has a 'Notes' tab, and the Change Request form has Planning and Closure Information tabs, but there is no stored information about the Problem form's tabs to confirm 'Notes' is shared across all three forms.
- **missing** `9680f077` (static-environment): I am working with a few forms in our ServiceNow portal. Create Change Request vs Hardware. In both forms -- hardware and create-request -- what is the name of t → Quantity. None of the stored items mention a 'Quantity' field or compare mandatory/non-mutable fields between the Hardware asset form and the Change Request form.
- **missing** `c80ca967` (static-environment): I am working in our ServiceNow based portal. On the `Sales Laptop` item page under `Service Catalog > Hardware`, what are the names of the two sections shown on → Order this Item; Shopping Cart. None of the stored items describe the specific UI sections shown on the right side of the Sales Laptop catalog item page (Order this Item; Shopping Cart).
- **missing** `d83c4bf7` (dynamic-environment): I am working with our ServiceNow portal while creating a hardware asset record. After clicking New and loading the blank Hardware form, what default value is sh → in use. None of the stored items mention the default value shown in the State dropdown when creating a new Hardware Asset record.
- **partial** `7ea13f14` (dynamic-environment): I am working with our ServiceNow portal. When marking a problem as duplicate, a popup appears to collect additional information. Which field(s) are actually in  → A. The stored fact mentions that clicking 'Mark Duplicate' displays the 'Duplicate of' reference field, but describes it as appearing on the form itself rather than explicitly confirming it appears in a popup, and doesn't fully clarify the popup-only fields versus form-level changes.
- **missing** `78686f4e` (dynamic-environment): I am working with our ServiceNow portal. When we remove a user record, which option exactly matches the other record types that might be automatically affected? → D. None of the stored items contain information about which related record types (notification device, expense line, user preference, etc.) are automatically affected when a user record is deleted in ServiceNow.
- **partial** `eb3cfd03` (procedure): I am working with our ServiceNow portal. In our company's typical workflow, what are the modules we need to visit in order to restock items that are low in quan → H. The stored items mention both Reports > View/Run and Self-Service > Service Catalog modules, which are the two modules in the expected answer H, but they do not explicitly connect these modules to the workflow of restocking low-quantity items.

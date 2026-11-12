# Dreaming eval answers: dreaming-eval-workarena, run wa-dev-1

The agent `dreaming-eval-workarena-answerer` answered each target's question from the AI index; `.anthropic-claude-4.6-sonnet-chat_completion` judged the answers. Correct counts 1 and partial 0.5. The agent ran 58 AI index queries, 0 answers without one.

## Overall

| | Targets | Correct | Partial | Incorrect | Error | Score |
| --- | --- | --- | --- | --- | --- | --- |
| all | 10 | 5 | 0 | 5 | 0 | 50.0% |

## By dataset

| | Targets | Correct | Partial | Incorrect | Error | Score |
| --- | --- | --- | --- | --- | --- | --- |
| longmemeval_v2_enterprise | 10 | 5 | 0 | 5 | 0 | 50.0% |

## By category

| | Targets | Correct | Partial | Incorrect | Error | Score |
| --- | --- | --- | --- | --- | --- | --- |
| dynamic-environment | 3 | 1 | 0 | 2 | 0 | 33.3% |
| procedure | 3 | 3 | 0 | 0 | 0 | 100.0% |
| static-environment | 4 | 1 | 0 | 3 | 0 | 25.0% |

## Not correct

- **incorrect** `c0593d69` (static-environment): I am working with a few forms in our ServiceNow portal. Create Change Request vs Problem vs Incident vs Hardware vs User. Among create-request, problem, inciden → expected four; answered Going by what's recorded about the portal, **three** of the five forms have subtabs below the field-entry section: - **Create Change Request** (change_request.do) has tabs: Planning (Justification, Im (6 tool calls). The assistant answered three, while the reference answer is four.
- **incorrect** `9680f077` (static-environment): I am working with a few forms in our ServiceNow portal. Create Change Request vs Hardware. In both forms -- hardware and create-request -- what is the name of t → expected Quantity; answered I couldn't find the answer: the AI Index doesn't say which fields are read-only on either form, so I can't tell you which mandatory field is non-mutable on only one of them. Here's what I did find: -  (8 tool calls). The assistant says it cannot determine the answer and does not mention 'Quantity' at all.
- **incorrect** `c80ca967` (static-environment): I am working in our ServiceNow based portal. On the `Sales Laptop` item page under `Service Catalog > Hardware`, what are the names of the two sections shown on → expected Order this Item; Shopping Cart; answered I couldn't find this in the knowledge index. I ran several searches with different wordings: "Sales Laptop", "right side", "Shopping Cart", "Order this Item", page layout, and session summaries. None  (10 tool calls). The assistant said 'Unknown' instead of providing the correct answer 'Order this Item; Shopping Cart'.
- **incorrect** `d83c4bf7` (dynamic-environment): I am working with our ServiceNow portal while creating a hardware asset record. After clicking New and loading the blank Hardware form, what default value is sh → expected in use; answered I couldn't find this in the AI Index, so I don't know what the State dropdown shows by default on a new Hardware form. What the index does say is that State is a field on the General tab of the Hardwa (9 tool calls). The assistant said the answer is unknown and did not provide 'in use' as the default value.
- **incorrect** `78686f4e` (dynamic-environment): I am working with our ServiceNow portal. When we remove a user record, which option exactly matches the other record types that might be automatically affected? → expected D; answered I couldn't find this in the knowledge base, so I can't tell you which option is correct. The knowledge base does describe deleting a user. You open the user's record (System Security > Users and Group (12 tool calls). The assistant explicitly states it cannot determine the answer and boxes 'Unknown' instead of the correct answer D.

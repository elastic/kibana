import { GetCitationElement } from "./types";

export const getCitationElement: GetCitationElement = ({
    citationLable,
    citationLink
}) => {
    return `!{citation[${citationLable}](${citationLink})}`
}
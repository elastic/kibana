def generateCodeOwners(destination, title) {
  kibanaPipeline.bash("""
    source src/dev/ci_setup/setup_env.sh true
    yarn kbn bootstrap --prefer-offline

    . packages/kbn-dev-utils/src/code_ownership/shell_scripts/generate_code_owners.sh '${destination}'
    cat '${destination}'
  """, title)
}

def generateTeamAssignments(teamAssignmentsPath, title) {
  kibanaPipeline.bash("""
    source src/dev/ci_setup/setup_env.sh
    yarn kbn bootstrap --prefer-offline

    # Build team assignments dat file
    node scripts/generate_team_assignments.js --verbose --dest '${teamAssignmentsPath}'

    cat '${teamAssignmentsPath}'
  """, title)
}

return this
